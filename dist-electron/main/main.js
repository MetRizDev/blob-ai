"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const electron_1 = require("electron");
const settings_1 = require("../shared/settings");
const store_1 = require("./store");
const ipc_1 = require("./ipc");
let settings = (0, store_1.loadSettings)();
let overlayWindow = null;
let chatWindow = null;
let tray = null;
const preload = node_path_1.default.join(__dirname, 'preload.js');
const devUrl = process.env.VITE_DEV_SERVER_URL || '';
function pageUrl(hash) {
    if (devUrl)
        return `${devUrl.replace(/\/$/, '')}/#${hash}`;
    return `${(0, node_url_1.pathToFileURL)(node_path_1.default.join(__dirname, '../../dist/index.html')).href}#${hash}`;
}
function broadcast(channel, payload) {
    for (const window of electron_1.BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed())
            window.webContents.send(channel, payload);
    }
}
function createOverlay() {
    const area = electron_1.screen.getPrimaryDisplay().workArea;
    overlayWindow = new electron_1.BrowserWindow({
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height,
        frame: false,
        transparent: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        hasShadow: false,
        alwaysOnTop: settings.blob.alwaysOnTop,
        webPreferences: {
            preload,
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false
        }
    });
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.loadURL(pageUrl('overlay'));
    overlayWindow.on('closed', () => (overlayWindow = null));
}
function updateOverlayBounds() {
    if (!overlayWindow || overlayWindow.isDestroyed())
        return;
    const area = electron_1.screen.getPrimaryDisplay().workArea;
    overlayWindow.setBounds({ x: area.x, y: area.y, width: area.width, height: area.height });
}
function createChat(show = true) {
    if (chatWindow && !chatWindow.isDestroyed()) {
        if (show) {
            chatWindow.show();
            chatWindow.focus();
        }
        return chatWindow;
    }
    chatWindow = new electron_1.BrowserWindow({
        width: 456,
        height: 780,
        minWidth: 372,
        minHeight: 520,
        frame: false,
        transparent: true,
        resizable: true,
        alwaysOnTop: settings.blob.alwaysOnTop,
        skipTaskbar: false,
        show: false,
        webPreferences: {
            preload,
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    chatWindow.loadURL(pageUrl('chat'));
    chatWindow.once('ready-to-show', () => {
        if (show && chatWindow && !chatWindow.isDestroyed()) {
            chatWindow.show();
            chatWindow.focus();
        }
    });
    chatWindow.on('closed', () => (chatWindow = null));
    return chatWindow;
}
function openChat() {
    createChat(true);
}
function hideChat() {
    if (chatWindow && !chatWindow.isDestroyed())
        chatWindow.hide();
}
function toggleChat() {
    if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible())
        hideChat();
    else
        openChat();
}
function openSettings() {
    const window = createChat(true);
    const navigate = () => setTimeout(() => {
        if (!window.isDestroyed())
            window.webContents.send('navigate:settings');
    }, 200);
    if (window.webContents.isLoading())
        window.webContents.once('did-finish-load', navigate);
    else
        navigate();
}
function updateTrayMenu() {
    if (!tray)
        return;
    tray.setContextMenu(electron_1.Menu.buildFromTemplate([
        { label: '💬 Открыть чат', click: () => openChat() },
        { label: '⚙️ Настройки', click: () => openSettings() },
        {
            label: settings.blob.pinned ? '📌 Открепить блоба' : '📌 Закрепить блоба',
            click: () => setSettings({ blob: { pinned: !settings.blob.pinned } })
        },
        { type: 'separator' },
        { label: '❌ Выйти', click: () => electron_1.app.quit() }
    ]));
}
function createTray() {
    const iconPath = node_path_1.default.join(electron_1.app.getAppPath(), 'build', 'icon.png');
    const icon = node_fs_1.default.existsSync(iconPath)
        ? electron_1.nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 })
        : electron_1.nativeImage.createEmpty();
    try {
        tray = new electron_1.Tray(icon);
        tray.setToolTip('Blob — твой милый помощник');
        tray.on('click', () => toggleChat());
        updateTrayMenu();
    }
    catch (error) {
        console.warn('[blob] трей не создан:', error);
    }
}
function applySettings() {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.setAlwaysOnTop(settings.blob.alwaysOnTop);
        if (settings.blob.clickThrough)
            overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    }
    if (chatWindow && !chatWindow.isDestroyed())
        chatWindow.setAlwaysOnTop(settings.blob.alwaysOnTop);
    try {
        electron_1.app.setLoginItemSettings({ openAtLogin: Boolean(settings.general.startAtLogin) });
    }
    catch (_) {
        /* в portable-режиме может быть недоступно */
    }
    electron_1.globalShortcut.unregisterAll();
    if (settings.general.hotkey) {
        try {
            electron_1.globalShortcut.register(settings.general.hotkey, () => toggleChat());
        }
        catch (error) {
            console.warn('[blob] не удалось зарегистрировать хоткей:', error);
        }
    }
    updateTrayMenu();
}
function setSettings(patch) {
    settings = (0, settings_1.deepMerge)(settings, patch || {});
    (0, store_1.saveSettings)(settings);
    applySettings();
    broadcast('settings:changed', settings);
    return settings;
}
function setOverlayIgnore(ignore) {
    if (!overlayWindow || overlayWindow.isDestroyed())
        return;
    overlayWindow.setIgnoreMouseEvents(settings.blob.clickThrough || ignore, { forward: true });
}
const gotLock = electron_1.app.requestSingleInstanceLock();
if (!gotLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => openChat());
    electron_1.app.whenReady().then(() => {
        (0, ipc_1.registerIpc)({
            getSettings: () => settings,
            setSettings,
            sendToChat: (channel, payload) => broadcast(channel, payload),
            broadcast,
            setOverlayIgnore,
            openChat,
            hideChat,
            toggleChat,
            openSettings,
            minimizeChat: () => {
                if (chatWindow && !chatWindow.isDestroyed())
                    chatWindow.minimize();
            },
            quit: () => electron_1.app.quit()
        });
        createOverlay();
        createChat(true);
        createTray();
        applySettings();
        electron_1.screen.on('display-metrics-changed', updateOverlayBounds);
        electron_1.screen.on('display-added', updateOverlayBounds);
        electron_1.screen.on('display-removed', updateOverlayBounds);
    });
    electron_1.app.on('window-all-closed', () => {
        // Блоб живёт в трее даже когда чат закрыт
    });
    electron_1.app.on('before-quit', () => {
        electron_1.globalShortcut.unregisterAll();
        if (tray && !tray.isDestroyed())
            tray.destroy();
    });
}
//# sourceMappingURL=main.js.map