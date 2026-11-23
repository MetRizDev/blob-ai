"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSettings = loadSettings;
exports.saveSettings = saveSettings;
exports.resetSettings = resetSettings;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
const settings_1 = require("../shared/settings");
const FILE_NAME = 'settings.json';
const PREFIX = 'enc:v1:';
function filePath() {
    return node_path_1.default.join(electron_1.app.getPath('userData'), FILE_NAME);
}
function decode(value) {
    if (typeof value !== 'string')
        return '';
    if (!value.startsWith(PREFIX))
        return value;
    try {
        if (!electron_1.safeStorage.isEncryptionAvailable())
            return '';
        const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
        return electron_1.safeStorage.decryptString(raw);
    }
    catch (_) {
        return '';
    }
}
function encode(value) {
    if (!value)
        return '';
    try {
        if (electron_1.safeStorage.isEncryptionAvailable()) {
            return PREFIX + electron_1.safeStorage.encryptString(value).toString('base64');
        }
    }
    catch (_) {
        /* падаем назад к открытому хранению */
    }
    return value;
}
function loadSettings() {
    try {
        const file = filePath();
        if (!node_fs_1.default.existsSync(file))
            return { ...settings_1.DEFAULT_SETTINGS };
        const parsed = JSON.parse(node_fs_1.default.readFileSync(file, 'utf8'));
        const merged = (0, settings_1.mergeSettings)(parsed);
        merged.api.apiKey = decode(parsed?.api?.apiKey);
        return merged;
    }
    catch (_) {
        return { ...settings_1.DEFAULT_SETTINGS };
    }
}
function saveSettings(settings) {
    try {
        const file = filePath();
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(file), { recursive: true });
        const toWrite = { ...settings, api: { ...settings.api, apiKey: encode(settings.api.apiKey) } };
        node_fs_1.default.writeFileSync(file, JSON.stringify(toWrite, null, 2), 'utf8');
    }
    catch (error) {
        console.error('[blob] не удалось сохранить настройки:', error);
    }
}
function resetSettings() {
    const fresh = JSON.parse(JSON.stringify(settings_1.DEFAULT_SETTINGS));
    saveSettings(fresh);
    return fresh;
}
//# sourceMappingURL=store.js.map