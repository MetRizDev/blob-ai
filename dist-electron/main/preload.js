"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const ALLOWED_CHANNELS = [
    'ai:chunk',
    'ai:done',
    'ai:error',
    'tool:request',
    'tool:result',
    'settings:changed',
    'navigate:settings'
];
const api = {
    getSettings: () => electron_1.ipcRenderer.invoke('settings:get'),
    setSettings: (patch) => electron_1.ipcRenderer.invoke('settings:set', patch),
    resetSettings: () => electron_1.ipcRenderer.invoke('settings:reset'),
    ask: (messages) => electron_1.ipcRenderer.invoke('ai:ask', messages),
    generateImage: (prompt) => electron_1.ipcRenderer.invoke('ai:image', prompt),
    screenshot: () => electron_1.ipcRenderer.invoke('tool:screenshot'),
    runTool: (type, payload) => electron_1.ipcRenderer.invoke('tool:run', type, payload || {}),
    respondTool: (id, approved) => electron_1.ipcRenderer.invoke('tool:respond', id, approved),
    setOverlayIgnore: (ignore) => electron_1.ipcRenderer.invoke('overlay:ignore', ignore),
    openChat: () => electron_1.ipcRenderer.invoke('window:openChat'),
    hideChat: () => electron_1.ipcRenderer.invoke('window:hideChat'),
    toggleChat: () => electron_1.ipcRenderer.invoke('window:toggleChat'),
    openSettings: () => electron_1.ipcRenderer.invoke('window:openSettings'),
    minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
    closeWindow: () => electron_1.ipcRenderer.invoke('window:close'),
    quit: () => electron_1.ipcRenderer.invoke('app:quit'),
    version: () => electron_1.ipcRenderer.invoke('app:version'),
    on: (channel, callback) => {
        if (!ALLOWED_CHANNELS.includes(channel))
            return () => undefined;
        const listener = (_event, payload) => callback(payload);
        electron_1.ipcRenderer.on(channel, listener);
        return () => electron_1.ipcRenderer.removeListener(channel, listener);
    }
};
electron_1.contextBridge.exposeInMainWorld('blob', api);
//# sourceMappingURL=preload.js.map