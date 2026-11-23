"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTools = initTools;
exports.takeScreenshot = takeScreenshot;
exports.requestTool = requestTool;
exports.respondTool = respondTool;
const node_child_process_1 = require("node:child_process");
const electron_1 = require("electron");
const pending = new Map();
let send = () => undefined;
let getSettings = () => null;
const APP_MAP = {
    notepad: 'notepad.exe',
    блокнот: 'notepad.exe',
    calc: 'calc.exe',
    калькулятор: 'calc.exe',
    explorer: 'explorer.exe',
    проводник: 'explorer.exe',
    msedge: 'msedge.exe',
    edge: 'msedge.exe',
    chrome: 'chrome.exe',
    firefox: 'firefox.exe',
    code: 'code.cmd',
    vscode: 'code.cmd',
    spotify: 'spotify.exe',
    discord: 'discord.exe'
};
const FORBIDDEN_APPS = [
    'cmd', 'powershell', 'pwsh', 'reg', 'regedit', 'taskkill', 'taskmgr', 'format', 'del', 'rm',
    'rd', 'shutdown', 'wmic', 'mshta', 'rundll32', 'bash', 'python', 'node', 'git', 'net', 'sc'
];
const KEY_MAP = {
    ctrl: '^', control: '^', alt: '%', shift: '+', win: '^{ESC}',
    enter: '{ENTER}', return: '{ENTER}', esc: '{ESC}', escape: '{ESC}', tab: '{TAB}',
    space: ' ', backspace: '{BACKSPACE}', delete: '{DEL}', del: '{DEL}',
    up: '{UP}', down: '{DOWN}', left: '{LEFT}', right: '{RIGHT}',
    home: '{HOME}', end: '{END}', pageup: '{PGUP}', pagedown: '{PGDN}',
    f1: '{F1}', f2: '{F2}', f3: '{F3}', f4: '{F4}', f5: '{F5}', f6: '{F6}',
    f7: '{F7}', f8: '{F8}', f9: '{F9}', f10: '{F10}', f11: '{F11}', f12: '{F12}',
    copy: '^c', paste: '^v', cut: '^x', save: '^s', undo: '^z'
};
function initTools(sender, settingsGetter) {
    send = sender;
    getSettings = settingsGetter;
}
function emit(result) {
    send('tool:result', result);
}
function psQuote(value) {
    return `'${String(value).replace(/'/g, "''")}'`;
}
function runPowerShell(script) {
    return new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
            windowsHide: true
        });
        let out = '';
        let err = '';
        child.stdout?.on('data', (chunk) => (out += chunk.toString()));
        child.stderr?.on('data', (chunk) => (err += chunk.toString()));
        child.on('error', reject);
        child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(err || `PowerShell: exit ${code}`))));
    });
}
function clampToScreen(x, y) {
    const area = electron_1.screen.getPrimaryDisplay().workArea;
    return {
        x: Math.max(area.x, Math.min(area.x + area.width - 1, Math.round(x))),
        y: Math.max(area.y, Math.min(area.y + area.height - 1, Math.round(y)))
    };
}
function toSendKeys(keys) {
    return String(keys || '')
        .toLowerCase()
        .split(/\s*\+\s*/)
        .filter(Boolean)
        .map((part) => KEY_MAP[part] ?? (part.length === 1 ? part : `{${part.toUpperCase()}}`))
        .join('');
}
function sendKeysLiteral(text) {
    return String(text).replace(/([+^%~(){}[\]])/g, '{$1}');
}
async function takeScreenshot(scale = 1) {
    const factor = Math.max(0.5, Math.min(2, scale || 1));
    const sources = await electron_1.desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: Math.round(1920 * factor), height: Math.round(1080 * factor) }
    });
    if (!sources.length)
        throw new Error('Не удалось найти экран для скриншота');
    return sources[0].thumbnail.toDataURL({ scaleFactor: 1 });
}
function validate(type, payload) {
    const s = getSettings();
    if (!s?.tools?.enabled)
        return { ok: false, reason: 'Инструменты отключены в настройках', dangerous: false };
    const known = ['screenshot', 'mouse_move', 'mouse_click', 'key_press', 'type_text', 'scroll', 'open_app'];
    if (!known.includes(type))
        return { ok: false, reason: `Неизвестное действие: ${type}`, dangerous: false };
    if (type === 'open_app') {
        const raw = String(payload?.app || '').trim().toLowerCase();
        const command = (APP_MAP[raw] || '').toLowerCase();
        const commandName = command.replace(/\.(exe|cmd|bat)$/i, '');
        const allowed = (s.tools.allowedApps || []).map((a) => a.toLowerCase().replace(/\.(exe|cmd|bat)$/i, ''));
        const forbidden = FORBIDDEN_APPS.some((word) => raw.includes(word) || commandName.includes(word));
        if (forbidden)
            return { ok: false, reason: 'Запуск системных/опасных программ запрещён', dangerous: true };
        if (!allowed.includes(raw) && !allowed.includes(commandName)) {
            return { ok: false, reason: `Программа «${raw}» не в белом списке`, dangerous: true };
        }
        if (!command)
            return { ok: false, reason: `Не знаю программу «${raw}». Доступно: ${Object.keys(APP_MAP).join(', ')}`, dangerous: false };
    }
    if (type === 'type_text' && String(payload?.text || '').length > 2000) {
        return { ok: false, reason: 'Слишком длинный текст для ввода', dangerous: true };
    }
    if (type === 'key_press') {
        const keys = String(payload?.keys || '').toLowerCase();
        if (/ctrl\+alt\+delete|win\+r|alt\+f4|shift\+delete/.test(keys)) {
            return { ok: false, reason: 'Это сочетание клавиш заблокировано ради безопасности', dangerous: true };
        }
    }
    const dangerous = ['key_press', 'mouse_click', 'type_text', 'scroll', 'open_app'].includes(type);
    return { ok: true, reason: '', dangerous };
}
function describe(type, payload) {
    switch (type) {
        case 'screenshot': return 'Сделать скриншот экрана';
        case 'mouse_move': return `Передвинуть курсор в (${payload?.x}, ${payload?.y})`;
        case 'mouse_click': return `${payload?.clicks === 2 ? 'Двойной' : 'Одинарный'} клик ${payload?.button === 'right' ? 'правой' : 'левой'} кнопкой в (${payload?.x}, ${payload?.y})`;
        case 'key_press': return `Нажать клавиши: ${payload?.keys}`;
        case 'type_text': return `Ввести текст: ${String(payload?.text || '').slice(0, 80)}`;
        case 'scroll': return `Прокрутить экран в точке (${payload?.x}, ${payload?.y})`;
        case 'open_app': return `Открыть программу: ${payload?.app}`;
        default: return `Действие: ${type}`;
    }
}
function requestTool(type, payload) {
    const s = getSettings();
    const check = validate(type, payload);
    if (!check.ok) {
        emit({ id: `blocked-${Date.now()}`, ok: false, message: check.reason });
        return;
    }
    const id = `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const request = { id, type, description: describe(type, payload), payload: payload || {}, dangerous: check.dangerous };
    send('tool:request', request);
    const timeout = Math.max(10, s.tools.confirmTimeout || 90) * 1000;
    const timer = setTimeout(() => {
        pending.delete(id);
        emit({ id, ok: false, message: 'Время на подтверждение истекло — действие отменено' });
    }, timeout);
    pending.set(id, {
        timer,
        resolve: (approved) => {
            clearTimeout(timer);
            if (!approved) {
                emit({ id, ok: false, message: 'Пользователь запретил действие' });
                return;
            }
            execute(id, type, payload || {}).catch((error) => {
                emit({ id, ok: false, message: error?.message || String(error) });
            });
        }
    });
}
function respondTool(id, approved) {
    const item = pending.get(id);
    if (!item)
        return;
    pending.delete(id);
    clearTimeout(item.timer);
    item.resolve(approved);
}
async function execute(id, type, payload) {
    const s = getSettings();
    let message = '';
    let data = undefined;
    switch (type) {
        case 'screenshot': {
            const dataUrl = await takeScreenshot(s.tools.screenshotScale);
            data = { dataUrl };
            message = 'Скриншот готов';
            break;
        }
        case 'mouse_move': {
            const { x, y } = clampToScreen(Number(payload.x) || 0, Number(payload.y) || 0);
            await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x},${y});`);
            message = `Курсор перемещён в (${x}, ${y})`;
            break;
        }
        case 'mouse_click': {
            const pos = clampToScreen(Number(payload.x) || 0, Number(payload.y) || 0);
            const button = payload.button === 'right' ? 'right' : 'left';
            const clicks = Math.max(1, Math.min(2, Number(payload.clicks) || 1));
            const down = button === 'right' ? 0x0008 : 0x0002;
            const up = button === 'right' ? 0x0010 : 0x0004;
            const script = [
                'Add-Type -AssemblyName System.Windows.Forms;',
                `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${pos.x},${pos.y});`,
                "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class BlobMouse { [DllImport(\"user32.dll\")] public static extern void mouse_event(int f, int dx, int dy, int d, UIntPtr e); }';",
                ...Array.from({ length: clicks }, () => `[BlobMouse]::mouse_event(${down},0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 60; [BlobMouse]::mouse_event(${up},0,0,0,[UIntPtr]::Zero);`)
            ].join(' ');
            await runPowerShell(script);
            message = `${clicks === 2 ? 'Двойной' : 'Одинарный'} клик выполнен`;
            break;
        }
        case 'key_press': {
            const keys = toSendKeys(String(payload.keys || ''));
            if (!keys)
                throw new Error('Не указаны клавиши');
            await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(${psQuote(keys)});`);
            message = `Нажато: ${payload.keys}`;
            break;
        }
        case 'type_text': {
            const text = sendKeysLiteral(String(payload.text || ''));
            if (!text)
                throw new Error('Пустой текст');
            await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(${psQuote(text)});`);
            message = 'Текст введён';
            break;
        }
        case 'scroll': {
            const pos = clampToScreen(Number(payload.x) || 0, Number(payload.y) || 0);
            const delta = Math.max(-1200, Math.min(1200, Number(payload.deltaY) || 0));
            const script = [
                'Add-Type -AssemblyName System.Windows.Forms;',
                `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${pos.x},${pos.y});`,
                "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class BlobWheel { [DllImport(\"user32.dll\")] public static extern void mouse_event(int f, int dx, int dy, int d, UIntPtr e); }';",
                `[BlobWheel]::mouse_event(2048,0,0,${delta},[UIntPtr]::Zero);`
            ].join(' ');
            await runPowerShell(script);
            message = 'Прокрутка выполнена';
            break;
        }
        case 'open_app': {
            const command = APP_MAP[String(payload.app).toLowerCase()];
            if (!command)
                throw new Error('Программа не найдена');
            await new Promise((resolve, reject) => {
                let settled = false;
                const useShell = /\.(cmd|bat)$/i.test(command);
                const child = (0, node_child_process_1.spawn)(command, [], { detached: true, windowsHide: false, shell: useShell });
                child.on('error', async (error) => {
                    if (settled)
                        return;
                    settled = true;
                    try {
                        await electron_1.shell.openPath(command);
                        resolve();
                    }
                    catch (_) {
                        reject(error);
                    }
                });
                child.on('spawn', () => {
                    if (settled)
                        return;
                    settled = true;
                    child.unref();
                    resolve();
                });
            });
            message = `Программа «${payload.app}» открыта`;
            break;
        }
        default:
            throw new Error('Неизвестное действие');
    }
    emit({ id, ok: true, message, data });
}
//# sourceMappingURL=tools.js.map