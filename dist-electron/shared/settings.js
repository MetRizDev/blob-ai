"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = exports.VOICE_PACKS = exports.PERSONA_PRESETS = exports.API_PRESETS = void 0;
exports.deepMerge = deepMerge;
exports.mergeSettings = mergeSettings;
const prompt_1 = require("./prompt");
exports.API_PRESETS = [
    {
        id: 'openai',
        label: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        imageModel: 'gpt-image-1',
        keyHint: 'sk-...'
    },
    {
        id: 'openrouter',
        label: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'openai/gpt-4o-mini',
        imageModel: 'openai/gpt-4o-mini',
        keyHint: 'sk-or-...'
    },
    {
        id: 'groq',
        label: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile',
        imageModel: '',
        keyHint: 'gsk_...'
    },
    {
        id: 'deepseek',
        label: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        imageModel: '',
        keyHint: 'sk-...'
    },
    {
        id: 'custom',
        label: 'Свой (OpenAI-совместимый)',
        baseUrl: 'http://localhost:1234/v1',
        model: 'local-model',
        imageModel: '',
        keyHint: 'любой'
    }
];
exports.PERSONA_PRESETS = {
    cute: 'милый, игривый и очень добрый',
    friendly: 'дружелюбный, полезный и спокойный',
    professional: 'вежливый, краткий и деловой',
    sarcastic: 'остроумный с лёгким юмором, но никогда грубый',
    calm: 'очень спокойный, мягкий и рассудительный'
};
exports.VOICE_PACKS = {
    classic: 'Классический пиксель',
    sans: 'Санс (низкий, ленивый)',
    papyrus: 'Папирус (высокий, быстрый)',
    flowey: 'Флауи (шепчущий)'
};
exports.DEFAULT_SETTINGS = {
    version: 1,
    assistantName: 'Блоб',
    userName: 'друг',
    persona: 'cute',
    api: {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
        temperature: 0.8,
        maxTokens: 300,
        stream: true,
        imageEnabled: true,
        imageModel: 'gpt-image-1',
        imageSize: '1024x1024',
        systemPrompt: prompt_1.DEFAULT_SYSTEM_PROMPT
    },
    voice: {
        mode: 'undertale',
        voiceURI: '',
        rate: 1,
        pitch: 1.1,
        volume: 0.8,
        autoSpeak: true,
        pack: 'classic'
    },
    blob: {
        size: 172,
        opacity: 0.96,
        bounce: 0.78,
        gravity: 0.22,
        softness: 0.7,
        pinned: false,
        physics: true,
        margin: 18,
        alwaysOnTop: true,
        clickThrough: false,
        colorTop: '#ffe27a',
        colorBottom: '#ff8a1f',
        faceScale: 1,
        showAccessory: true,
        blinkRate: 1
    },
    ui: {
        theme: 'system',
        accent: '#ff9d2e',
        uiScale: 1,
        glass: 0.75,
        animations: true,
        showEmotionBadge: true,
        compactMessages: false
    },
    tools: {
        enabled: true,
        confirmTimeout: 90,
        allowedApps: ['notepad', 'calc', 'explorer', 'msedge', 'chrome', 'code'],
        screenshotScale: 1,
        askEveryTime: true
    },
    general: {
        startAtLogin: false,
        hotkey: 'Control+Shift+B',
        showChatOnClick: true,
        soundOnLaunch: false,
        language: 'ru'
    }
};
function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function deepMerge(base, patch) {
    if (!isPlainObject(patch))
        return base;
    const result = { ...base };
    for (const key of Object.keys(patch)) {
        if (isPlainObject(patch[key]) && isPlainObject(result[key])) {
            result[key] = deepMerge(result[key], patch[key]);
        }
        else if (patch[key] !== undefined) {
            result[key] = patch[key];
        }
    }
    return result;
}
function mergeSettings(patch) {
    return deepMerge(exports.DEFAULT_SETTINGS, patch || {});
}
//# sourceMappingURL=settings.js.map