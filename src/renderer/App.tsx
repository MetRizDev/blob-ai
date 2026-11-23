import React, { useEffect, useRef, useState } from 'react';
import { getEmotion } from '../shared/emotions';
import { DEFAULT_SETTINGS } from '../shared/settings';
import { parseAIResponse } from '../shared/parser';
import { speak, stopAll } from './audio';
import SettingsView from './components/SettingsView';
import type { ChatMessage, ChatRoleMessage, Settings, ToolRequest, ToolResult } from '../shared/types';

interface ToolCard extends ToolRequest {
  status: 'pending' | 'approved' | 'denied' | 'done' | 'error';
  result?: string;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const TOOL_ICONS: Record<string, string> = {
  screenshot: '📷',
  mouse_move: '🖱️',
  mouse_click: '👆',
  key_press: '⌨️',
  type_text: '✍️',
  scroll: '↕️',
  open_app: '🚀'
};

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<ChatMessage['attachment']>(undefined);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'chat' | 'settings'>('chat');
  const [toolCards, setToolCards] = useState<ToolCard[]>([]);
  const [version, setVersion] = useState('1.0.0');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.blob.getSettings().then((value) => {
      settingsRef.current = value;
      setSettings(value);
    }).catch(() => undefined);
    window.blob.version().then(setVersion).catch(() => undefined);

    const offs = [
      window.blob.on('settings:changed', (value: Settings) => {
        settingsRef.current = value;
        setSettings(value);
      }),
      window.blob.on('navigate:settings', () => setTab('settings')),
      window.blob.on('ai:chunk', (delta: string) => {
        setMessages((previous) => {
          const next = [...previous];
          for (let index = next.length - 1; index >= 0; index -= 1) {
            const message = next[index];
            if (message.role === 'assistant' && message.pending) {
              const raw = (message.raw || '') + String(delta || '');
              next[index] = { ...message, raw, text: parseAIResponse(raw).text };
              break;
            }
          }
          messagesRef.current = next;
          return next;
        });
      }),
      window.blob.on('tool:request', (request: ToolRequest) => {
        setToolCards((previous) => [...previous, { ...request, status: 'pending' }]);
      }),
      window.blob.on('tool:result', (result: ToolResult) => {
        setToolCards((previous) => previous.map((card) => card.id === result.id
          ? { ...card, status: result.ok ? 'done' : 'error', result: result.message }
          : card));
        if (result.data?.dataUrl) {
          setMessages((previous) => [...previous, {
            id: uid(),
            role: 'assistant',
            text: 'Вот скриншот экрана:',
            image: { dataUrl: result.data.dataUrl, prompt: 'Скриншот экрана' },
            time: Date.now()
          }]);
        }
      })
    ];
    return () => offs.forEach((off) => off());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const dark = settings.ui.theme === 'dark' || (settings.ui.theme === 'system' && systemDark);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.setProperty('--accent', settings.ui.accent);
    root.style.setProperty('--glass', String(settings.ui.glass));
    root.style.setProperty('--ui-scale', String(settings.ui.uiScale));
    document.body.classList.toggle('no-animations', !settings.ui.animations);
    messagesRef.current = messages;
  }, [settings, messages]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, toolCards, busy]);

  const updateSettings = (patch: any) => {
    window.blob.setSettings(patch).then((value) => {
      settingsRef.current = value;
      setSettings(value);
    }).catch(() => undefined);
  };

  const attachScreenshot = async () => {
    const result = await window.blob.screenshot();
    if (result.ok && result.dataUrl) {
      setAttachment({ dataUrl: result.dataUrl, name: 'screenshot.png' });
    }
  };

  const send = async (override?: string) => {
    const text = (override !== undefined ? override : input).trim();
    if ((!text && !attachment) || busy) return;

    const userMessage: ChatMessage = {
      id: uid(),
      role: 'user',
      text,
      attachment: attachment || undefined,
      time: Date.now()
    };
    const answer: ChatMessage = {
      id: uid(),
      role: 'assistant',
      text: '',
      raw: '',
      pending: true,
      time: Date.now()
    };
    const current = messagesRef.current;
    const next = [...current, userMessage, answer];
    messagesRef.current = next;
    setMessages(next);
    setInput('');
    setAttachment(undefined);
    setBusy(true);
    stopAll();

    const history: ChatRoleMessage[] = [...current, userMessage]
      .filter((message) => !message.pending && !message.error && (message.text || message.attachment))
      .slice(-20)
      .map((message) => message.attachment
        ? {
            role: 'user' as const,
            content: [
              { type: 'text', text: message.text || 'Что изображено на экране?' },
              { type: 'image_url', image_url: { url: message.attachment.dataUrl } }
            ]
          }
        : { role: message.role, content: message.text });

    try {
      const result = await window.blob.ask(history);
      if (!result.ok || !result.parsed) {
        throw new Error(result.error || 'Не удалось получить ответ');
      }
      const parsed = result.parsed;
      const visibleText = parsed.text || (parsed.tools.length ? 'Сейчас сделаю!' : '…');
      const finalMessages = messagesRef.current.map((message) => message.id === answer.id
        ? { ...message, text: visibleText, raw: result.raw, emotion: parsed.emotion, pending: false }
        : message);
      messagesRef.current = finalMessages;
      setMessages(finalMessages);

      if (parsed.text && settingsRef.current.voice.autoSpeak) speak(parsed.text, settingsRef.current);

      if (parsed.imagePrompt && settingsRef.current.api.imageEnabled) {
        const image = await window.blob.generateImage(parsed.imagePrompt);
        if (image.ok && image.dataUrl) {
          setMessages((previous) => [...previous, {
            id: uid(),
            role: 'assistant',
            text: 'Вот, что у меня получилось!',
            image: { dataUrl: image.dataUrl!, prompt: parsed.imagePrompt! },
            time: Date.now()
          }]);
        } else {
          setMessages((previous) => [...previous, {
            id: uid(),
            role: 'assistant',
            text: `Не получилось нарисовать картинку: ${image.error || 'неизвестная ошибка'}`,
            error: true,
            time: Date.now()
          }]);
        }
      }

      for (const tool of parsed.tools) {
        await window.blob.runTool(tool.type, tool);
      }
    } catch (error: any) {
      const failed = messagesRef.current.map((message) => message.id === answer.id
        ? { ...message, text: `Ой, что-то пошло не так: ${error?.message || error}`, error: true, pending: false }
        : message);
      messagesRef.current = failed;
      setMessages(failed);
    } finally {
      setBusy(false);
    }
  };

  const respondTool = (card: ToolCard, approved: boolean) => {
    setToolCards((previous) => previous.map((item) => item.id === card.id
      ? { ...item, status: approved ? 'approved' : 'denied' }
      : item));
    window.blob.respondTool(card.id, approved).catch(() => undefined);
  };

  const emotion = getEmotion(messages.filter((m) => m.role === 'assistant').slice(-1)[0]?.emotion);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="avatar-button" onClick={() => setTab(tab === 'chat' ? 'settings' : 'chat')} title="Переключить вид">
          <span className="mini-blob">◡</span>
        </button>
        <div className="topbar-title">
          <strong>{settings.assistantName}</strong>
          <small><i className={`status-dot${settings.api.apiKey ? ' online' : ''}`} />{settings.api.apiKey ? 'на связи' : 'добавь API-ключ в настройках'}</small>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" onClick={() => setTab(tab === 'chat' ? 'settings' : 'chat')} title={tab === 'chat' ? 'Настройки' : 'Чат'}>{tab === 'chat' ? '⚙' : '💬'}</button>
          <button className="icon-button" onClick={() => window.blob.minimize()} title="Свернуть">—</button>
          <button className="icon-button close" onClick={() => window.blob.closeWindow()} title="Скрыть окно">✕</button>
        </div>
      </header>

      {tab === 'chat' ? (
        <div className="chat-view">
          <div className="messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="welcome">
                <div className="welcome-blob">☺</div>
                <h2>Привет, {settings.userName}!</h2>
                <p>Я {settings.assistantName} — маленький помощник на краю экрана. Напиши что-нибудь, попроси нарисовать картинку или покажи мне экран.</p>
                <div className="welcome-chips">
                  <button onClick={() => send('Расскажи, что ты умеешь')}>✨ Что ты умеешь?</button>
                  <button onClick={() => { setTab('settings'); }}>🎨 Настроить меня</button>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}${message.error ? ' error' : ''}`}>
                {message.role === 'assistant' && settings.ui.showEmotionBadge && message.emotion && (
                  <div className="emotion-badge" title={getEmotion(message.emotion).label}>
                    {getEmotion(message.emotion).emoji} {getEmotion(message.emotion).label}
                  </div>
                )}
                <div className="bubble">
                  {message.attachment && (
                    <div className="attachment">
                      <img src={message.attachment.dataUrl} alt="Вложение" />
                    </div>
                  )}
                  {message.text ? <span className="message-text">{message.text}</span> : message.pending ? (
                    <span className="typing"><i /><i /><i /></span>
                  ) : null}
                  {message.image && (
                    <div className="generated-image">
                      <img src={message.image.dataUrl} alt={message.image.prompt} />
                      <a className="download-button" href={message.image.dataUrl} download={`blob-${message.id}.png`}>⬇ Скачать картинку</a>
                    </div>
                  )}
                </div>
                <time>{new Date(message.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time>
              </div>
            ))}
          </div>

          {toolCards.length > 0 && (
            <div className="tool-panel">
              <div className="tool-panel-head"><span>🛡️ Действия требуют подтверждения</span><button onClick={() => setToolCards([])} title="Очистить">✕</button></div>
              {toolCards.map((card) => (
                <div key={card.id} className={`tool-card ${card.status}`}>
                  <div className="tool-icon">{TOOL_ICONS[card.type] || '•'}</div>
                  <div className="tool-info">
                    <strong>{card.description}</strong>
                    <small>{card.status === 'pending' ? (card.dangerous ? 'Внимание: действие затронет интерфейс' : 'Блоб ждёт вашего решения') : card.result}</small>
                  </div>
                  {card.status === 'pending' ? (
                    <div className="tool-actions">
                      <button className="deny" onClick={() => respondTool(card, false)}>Запретить</button>
                      <button className="allow" onClick={() => respondTool(card, true)}>Разрешить</button>
                    </div>
                  ) : <span className={`tool-status ${card.status}`}>{card.status === 'done' ? '✓' : '✕'}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="composer">
            {attachment && (
              <div className="attachment-preview">
                <img src={attachment.dataUrl} alt="Вложение" />
                <button onClick={() => setAttachment(undefined)}>✕</button>
              </div>
            )}
            <div className="composer-row">
              <button className="composer-icon" onClick={attachScreenshot} title="Прикрепить скриншот">📎</button>
              <textarea
                className="composer-input"
                rows={1}
                placeholder="Напиши блобу..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              <button className="composer-icon" onClick={() => window.blob.runTool('screenshot', {})} title="Показать экран блобу">📷</button>
              <button className="send-button" onClick={() => send()} disabled={busy || (!input.trim() && !attachment)} title="Отправить">↑</button>
            </div>
            <div className="composer-hint">
              <span>{emotion.emoji} {emotion.label}</span>
              <span>Enter — отправить · Shift+Enter — новая строка</span>
            </div>
          </div>
        </div>
      ) : (
        <SettingsView settings={settings} onChange={updateSettings} onClose={() => setTab('chat')} version={version} />
      )}
    </div>
  );
}
