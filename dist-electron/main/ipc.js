"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpc = registerIpc;
const electron_1 = require("electron");
const ai_1 = require("./ai");
const tools_1 = require("./tools");
const store_1 = require("./store");
function message(error) {
    return error?.message || String(error);
}
function registerIpc(ctx) {
    (0, tools_1.initTools)(ctx.sendToChat, ctx.getSettings);
    electron_1.ipcMain.handle('settings:get', () => ctx.getSettings());
    electron_1.ipcMain.handle('settings:set', (_event, patch) => ctx.setSettings(patch));
    electron_1.ipcMain.handle('settings:reset', () => {
        const fresh = (0, store_1.resetSettings)();
        ctx.setSettings(fresh);
        return ctx.getSettings();
    });
    electron_1.ipcMain.handle('ai:ask', async (event, messages) => {
        const wc = event.sender;
        try {
            const result = await (0, ai_1.askAI)(ctx.getSettings(), messages || [], (delta) => {
                if (!wc.isDestroyed())
                    wc.send('ai:chunk', delta);
            });
            ctx.broadcast('ai:done', result.parsed);
            return { ok: true, raw: result.raw, parsed: result.parsed };
        }
        catch (error) {
            const text = message(error);
            if (!wc.isDestroyed())
                wc.send('ai:error', text);
            return { ok: false, error: text };
        }
    });
    electron_1.ipcMain.handle('ai:image', async (_event, prompt) => {
        try {
            const dataUrl = await (0, ai_1.generateImage)(ctx.getSettings(), String(prompt || ''));
            return { ok: true, dataUrl };
        }
        catch (error) {
            return { ok: false, error: message(error) };
        }
    });
    electron_1.ipcMain.handle('tool:run', (_event, type, payload) => {
        (0, tools_1.requestTool)(String(type), payload || {});
        return true;
    });
    electron_1.ipcMain.handle('tool:respond', (_event, id, approved) => {
        (0, tools_1.respondTool)(id, Boolean(approved));
        return true;
    });
    electron_1.ipcMain.handle('tool:screenshot', async () => {
        try {
            const dataUrl = await (0, tools_1.takeScreenshot)(ctx.getSettings().tools.screenshotScale);
            return { ok: true, dataUrl };
        }
        catch (error) {
            return { ok: false, error: message(error) };
        }
    });
    electron_1.ipcMain.handle('overlay:ignore', (_event, ignore) => ctx.setOverlayIgnore(Boolean(ignore)));
    electron_1.ipcMain.handle('window:openChat', () => ctx.openChat());
    electron_1.ipcMain.handle('window:hideChat', () => ctx.hideChat());
    electron_1.ipcMain.handle('window:toggleChat', () => ctx.toggleChat());
    electron_1.ipcMain.handle('window:openSettings', () => ctx.openSettings());
    electron_1.ipcMain.handle('window:minimize', () => ctx.minimizeChat());
    electron_1.ipcMain.handle('window:close', () => ctx.hideChat());
    electron_1.ipcMain.handle('app:quit', () => ctx.quit());
    electron_1.ipcMain.handle('app:version', () => require('../../package.json').version);
}
//# sourceMappingURL=ipc.js.map