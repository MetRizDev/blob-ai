"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askAI = askAI;
exports.generateImage = generateImage;
const settings_1 = require("../shared/settings");
const parser_1 = require("../shared/parser");
const prompt_1 = require("../shared/prompt");
function apiBase(s) {
    let base = (s.api.baseUrl || '').trim().replace(/\/+$/, '');
    if (base.endsWith('/chat/completions'))
        base = base.slice(0, -'/chat/completions'.length);
    if (base.endsWith('/images/generations'))
        base = base.slice(0, -'/images/generations'.length);
    return base;
}
function headers(s) {
    const h = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${s.api.apiKey || ''}`
    };
    if (s.api.provider === 'openrouter') {
        h['HTTP-Referer'] = 'https://blob.local';
        h['X-Title'] = 'Blob Assistant';
    }
    return h;
}
function errorText(status, body) {
    let detail = body.slice(0, 400);
    try {
        const json = JSON.parse(body);
        detail = json?.error?.message || json?.message || detail;
    }
    catch (_) {
        /* оставляем как есть */
    }
    return `API вернул ${status}: ${detail}`;
}
async function askAI(settings, messages, onChunk) {
    const url = `${apiBase(settings)}/chat/completions`;
    const useStream = Boolean(settings.api.stream);
    const body = {
        model: settings.api.model,
        messages: [{ role: 'system', content: (0, prompt_1.buildSystemPrompt)(settings) }, ...messages],
        temperature: settings.api.temperature,
        max_tokens: settings.api.maxTokens,
        stream: useStream
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: headers(settings),
        body: JSON.stringify(body)
    });
    if (!response.ok)
        throw new Error(errorText(response.status, await response.text()));
    if (!useStream || !response.body) {
        const json = await response.json();
        const raw = json?.choices?.[0]?.message?.content || '';
        if (raw && onChunk)
            onChunk(raw);
        return { raw, parsed: (0, parser_1.parseAIResponse)(raw) };
    }
    let raw = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:'))
                continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]')
                continue;
            try {
                const json = JSON.parse(data);
                const delta = json?.choices?.[0]?.delta?.content || '';
                if (delta) {
                    raw += delta;
                    onChunk?.(delta);
                }
            }
            catch (_) {
                /* частичный chunk — пропускаем */
            }
        }
    }
    return { raw, parsed: (0, parser_1.parseAIResponse)(raw) };
}
async function generateImage(settings, prompt) {
    const url = `${apiBase(settings)}/images/generations`;
    const preset = settings_1.API_PRESETS.find((p) => p.id === settings.api.provider);
    const model = settings.api.imageModel || preset?.imageModel || settings.api.model;
    const common = { model, prompt, n: 1, size: settings.api.imageSize };
    const request = async (withFormat) => fetch(url, {
        method: 'POST',
        headers: headers(settings),
        body: JSON.stringify(withFormat ? { ...common, response_format: 'b64_json' } : common)
    });
    let response = await request(true);
    if (!response.ok) {
        const firstError = await response.text();
        response = await request(false);
        if (!response.ok)
            throw new Error(errorText(response.status, firstError + ' ' + (await response.text())));
    }
    const json = await response.json();
    const item = json?.data?.[0];
    if (item?.b64_json)
        return `data:image/png;base64,${item.b64_json}`;
    if (item?.url) {
        const imageResponse = await fetch(item.url);
        if (!imageResponse.ok)
            throw new Error('Не удалось скачать сгенерированную картинку');
        const buffer = Buffer.from(await imageResponse.arrayBuffer());
        return `data:image/png;base64,${buffer.toString('base64')}`;
    }
    throw new Error('API не вернул изображение');
}
//# sourceMappingURL=ai.js.map