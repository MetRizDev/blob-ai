import type { ParsedAI, ParsedTool } from './types';

function cleanJson(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
}

/** Вытаскивает служебные блоки из ответа модели и возвращает чистый текст. */
export function parseAIResponse(raw: string): ParsedAI {
  let text = raw || '';
  const emotionMatch = text.match(/\[emotion:([a-z0-9_-]+)\]/i);
  const imageMatch = text.match(/<<IMAGE>([\s\S]*?)<<\/IMAGE>>/i);
  const tools: ParsedTool[] = [];

  text = text.replace(/\[emotion:[a-z0-9_-]+\]/gi, '');
  text = text.replace(/<<IMAGE>[\s\S]*?<<\/IMAGE>>/gi, '');
  text = text.replace(/<<TOOL>([\s\S]*?)<<\/TOOL>>/gi, (_all, json) => {
    try {
      const parsed = JSON.parse(cleanJson(json));
      if (parsed && typeof parsed === 'object') tools.push(parsed as ParsedTool);
    } catch (_) {
      /* игнорируем кривой блок */
    }
    return '';
  });
  text = text.replace(/<TOOL>([\s\S]*?)<\/TOOL>/gi, (_all, json) => {
    try {
      const parsed = JSON.parse(cleanJson(json));
      if (parsed && typeof parsed === 'object') tools.push(parsed as ParsedTool);
    } catch (_) {
      /* игнорируем кривой блок */
    }
    return '';
  });

  return {
    text: text.replace(/\n{3,}/g, '\n\n').trim(),
    emotion: emotionMatch ? emotionMatch[1].toLowerCase() : undefined,
    imagePrompt: imageMatch ? imageMatch[1].trim() : undefined,
    tools
  };
}
