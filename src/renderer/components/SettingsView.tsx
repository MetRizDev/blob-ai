import React, { useEffect, useState } from 'react';
import { API_PRESETS, PERSONA_PRESETS, VOICE_PACKS } from '../../shared/settings';
import { DEFAULT_SYSTEM_PROMPT } from '../../shared/prompt';
import { previewVoice } from '../audio';
import type { ProviderId, Settings } from '../../shared/types';

type TabId = 'persona' | 'ai' | 'voice' | 'blob' | 'ui' | 'tools' | 'general';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'persona', label: 'Персона', icon: '🧸' },
  { id: 'ai', label: 'ИИ', icon: '✨' },
  { id: 'voice', label: 'Голос', icon: '🔊' },
  { id: 'blob', label: 'Блоб', icon: '🟠' },
  { id: 'ui', label: 'Интерфейс', icon: '🎨' },
  { id: 'tools', label: 'Инструменты', icon: '🛡️' },
  { id: 'general', label: 'Общее', icon: '⚙️' }
];

const ACCENTS = ['#ff9d2e', '#ff6b9d', '#7c8cff', '#4fd1c5', '#a78bfa', '#34d399', '#f472b6', '#facc15'];
const BLOB_PRESETS = [
  ['#ffe27a', '#ff8a1f'],
  ['#ffd1f1', '#ff6fb5'],
  ['#d4f5ff', '#5aa9ff'],
  ['#dcffd6', '#5fd38a'],
  ['#e9ddff', '#9b6dff'],
  ['#fff4cf', '#ffc247']
];

interface Props {
  settings: Settings;
  onChange: (patch: any) => void;
  onClose: () => void;
  version: string;
}

function patchAt(path: string[], value: any): any {
  const patch: any = {};
  let cursor = patch;
  path.forEach((key, index) => {
    if (index === path.length - 1) cursor[key] = value;
    else cursor = cursor[key] = {};
  });
  return patch;
}

function getAt(obj: any, path: string[]): any {
  return path.reduce((value, key) => (value == null ? undefined : value[key]), obj);
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="settings-section">
      <h3><span>{icon}</span> {title}</h3>
      <div className="settings-card glass">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-label">
        <div>{label}</div>
        {hint && <small>{hint}</small>}
      </div>
      <div className="settings-control">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <button className={`switch${checked ? ' on' : ''}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}><span /></button>;
}

function Slider({ value, min, max, step = 0.01, onChange, format }: {
  value: number; min: number; max: number; step?: number;
  onChange: (value: number) => void; format?: (value: number) => string;
}) {
  return (
    <div className="slider-wrap">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="slider-value">{format ? format(value) : value}</span>
    </div>
  );
}

function Select({ value, options, onChange }: { value: string; options: string[][]; onChange: (value: string) => void }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((option) => <option key={option[0]} value={option[0]}>{option[1]}</option>)}
    </select>
  );
}

export default function SettingsView({ settings, onChange, onClose, version }: Props) {
  const [tab, setTab] = useState<TabId>('persona');
  const [draft, setDraft] = useState<Settings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices?.() || []);
    load();
    if (window.speechSynthesis?.addEventListener) window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      if (window.speechSynthesis?.removeEventListener) window.speechSynthesis.removeEventListener('voiceschanged', load);
    };
  }, []);

  const update = (path: string[], value: any) => {
    const next = JSON.parse(JSON.stringify(draft)) as Settings;
    let cursor: any = next;
    path.slice(0, -1).forEach((key) => (cursor = cursor[key]));
    cursor[path[path.length - 1]] = value;
    setDraft(next);
    onChange(patchAt(path, value));
  };

  const applyPreset = (id: ProviderId) => {
    const preset = API_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const next = JSON.parse(JSON.stringify(draft)) as Settings;
    next.api.provider = preset.id;
    next.api.baseUrl = preset.baseUrl;
    next.api.model = preset.model;
    next.api.imageModel = preset.imageModel;
    setDraft(next);
    onChange({
      api: {
        provider: preset.id,
        baseUrl: preset.baseUrl,
        model: preset.model,
        imageModel: preset.imageModel
      }
    });
  };

  const resetAll = async () => {
    const fresh = await window.blob.resetSettings();
    setDraft(fresh);
  };

  const preview = () => {
    previewVoice({ ...draft, voice: { ...draft.voice, mode: draft.voice.mode === 'off' ? 'undertale' : draft.voice.mode } });
  };

  return (
    <div className="settings-view">
      <header className="topbar">
        <button className="icon-button" onClick={onClose} title="Назад в чат">‹</button>
        <div className="topbar-title"><strong>Настройки</strong><small>персонализация Блоба</small></div>
        <button className="icon-button" onClick={() => window.blob.closeWindow()} title="Закрыть окно">✕</button>
      </header>

      <nav className="settings-tabs">
        {TABS.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>

      <div className="settings-scroll">
        {tab === 'persona' && <>
          <Section title="Кто я и кто ты" icon="🧸">
            <Row label="Имя помощника" hint="как блоб будет называть себя"><input className="input" value={draft.assistantName} onChange={(e) => update(['assistantName'], e.target.value)} /></Row>
            <Row label="Как меня зовут"><input className="input" value={draft.userName} onChange={(e) => update(['userName'], e.target.value)} /></Row>
            <Row label="Характер">
              <Select value={draft.persona} options={Object.entries(PERSONA_PRESETS)} onChange={(value) => update(['persona'], value)} />
            </Row>
            <Row label="Язык ответов">
              <Select value={draft.general.language} options={[['ru', 'Русский'], ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'], ['es', 'Español'], ['tr', 'Türkçe']]} onChange={(value) => update(['general', 'language'], value)} />
            </Row>
          </Section>
          <Section title="Системный промпт" icon="📜">
            <Row label="Инструкции для модели" hint="плейсхолдеры {name}, {user}, {emotions}, {tools} заполняются автоматически">
              <textarea className="input prompt-area" value={draft.api.systemPrompt} onChange={(e) => update(['api', 'systemPrompt'], e.target.value)} spellCheck={false} />
            </Row>
            <button className="text-button" onClick={() => update(['api', 'systemPrompt'], DEFAULT_SYSTEM_PROMPT)}>↺ Вернуть стандартный промпт</button>
          </Section>
        </>}

        {tab === 'ai' && <>
          <Section title="Подключение" icon="🔑">
            <Row label="Провайдер">
              <Select value={draft.api.provider} options={API_PRESETS.map((p) => [p.id, p.label])} onChange={(value) => applyPreset(value as ProviderId)} />
            </Row>
            <Row label="API база" hint="адрес OpenAI-совместимого API"><input className="input" value={draft.api.baseUrl} onChange={(e) => update(['api', 'baseUrl'], e.target.value)} spellCheck={false} /></Row>
            <Row label="API ключ" hint="хранится зашифрованным через DPAPI">
              <div className="key-field">
                <input className="input" type={showKey ? 'text' : 'password'} placeholder={API_PRESETS.find((p) => p.id === draft.api.provider)?.keyHint || 'ключ'} value={draft.api.apiKey} onChange={(e) => update(['api', 'apiKey'], e.target.value)} spellCheck={false} />
                <button className="mini-button" onClick={() => setShowKey(!showKey)}>{showKey ? '🙈' : '👁'}</button>
              </div>
            </Row>
            <Row label="Модель"><input className="input" value={draft.api.model} onChange={(e) => update(['api', 'model'], e.target.value)} spellCheck={false} /></Row>
          </Section>
          <Section title="Параметры ответа" icon="🎛️">
            <Row label="Короткие ответы" hint="максимум токенов"><Slider value={draft.api.maxTokens} min={60} max={2000} step={20} onChange={(v) => update(['api', 'maxTokens'], v)} format={(v) => String(v)} /></Row>
            <Row label="Температура"><Slider value={draft.api.temperature} min={0} max={2} step={0.05} onChange={(v) => update(['api', 'temperature'], v)} format={(v) => v.toFixed(2)} /></Row>
            <Row label="Потоковый вывод"><Toggle checked={draft.api.stream} onChange={(v) => update(['api', 'stream'], v)} /></Row>
          </Section>
          <Section title="Картинки" icon="🖼️">
            <Row label="Генерация изображений"><Toggle checked={draft.api.imageEnabled} onChange={(v) => update(['api', 'imageEnabled'], v)} /></Row>
            <Row label="Модель для картинок"><input className="input" value={draft.api.imageModel} onChange={(e) => update(['api', 'imageModel'], e.target.value)} placeholder="gpt-image-1" spellCheck={false} /></Row>
            <Row label="Размер">
              <Select value={draft.api.imageSize} options={[['1024x1024', '1024 × 1024'], ['1024x1536', '1024 × 1536'], ['1536x1024', '1536 × 1024'], ['512x512', '512 × 512']]} onChange={(v) => update(['api', 'imageSize'], v)} />
            </Row>
          </Section>
        </>}

        {tab === 'voice' && <>
          <Section title="Как говорит блоб" icon="🔊">
            <Row label="Режим">
              <Select value={draft.voice.mode} options={[['off', 'Без звука'], ['undertale', 'Звуки как в Undertale'], ['speech', 'Озвучивание (голос системы)']]} onChange={(v) => update(['voice', 'mode'], v)} />
            </Row>
            <Row label="Громкость"><Slider value={draft.voice.volume} min={0} max={1} step={0.05} onChange={(v) => update(['voice', 'volume'], v)} format={(v) => `${Math.round(v * 100)}%`} /></Row>
            <Row label="Говорить после каждого ответа"><Toggle checked={draft.voice.autoSpeak} onChange={(v) => update(['voice', 'autoSpeak'], v)} /></Row>
            <button className="primary-button small" onClick={preview}>▶ Послушать</button>
          </Section>
          {draft.voice.mode === 'undertale' && <Section title="Набор звуков" icon="🎮">
            <Row label="Голос-блип">
              <Select value={draft.voice.pack} options={Object.entries(VOICE_PACKS)} onChange={(v) => update(['voice', 'pack'], v)} />
            </Row>
            <p className="hint-text">Каждой букве соответствует короткий музыкальный звук — как реплики персонажей в Undertale. Никаких внешних библиотек и файлов.</p>
          </Section>}
          {draft.voice.mode === 'speech' && <Section title="Голос системы" icon="🗣️">
            <Row label="Голос">
              <Select value={draft.voice.voiceURI} options={[['', 'Автоматически'], ...voices.map((voice) => [voice.voiceURI, `${voice.name} (${voice.lang})`])]} onChange={(v) => update(['voice', 'voiceURI'], v)} />
            </Row>
            <Row label="Скорость"><Slider value={draft.voice.rate} min={0.5} max={2} step={0.05} onChange={(v) => update(['voice', 'rate'], v)} format={(v) => `${v.toFixed(2)}×`} /></Row>
            <Row label="Высота"><Slider value={draft.voice.pitch} min={0.5} max={2} step={0.05} onChange={(v) => update(['voice', 'pitch'], v)} format={(v) => `${v.toFixed(2)}×`} /></Row>
          </Section>}
        </>}

        {tab === 'blob' && <>
          <Section title="Физика и движение" icon="🫧">
            <Row label="Размер"><Slider value={draft.blob.size} min={96} max={280} step={2} onChange={(v) => update(['blob', 'size'], v)} format={(v) => `${v}px`} /></Row>
            <Row label="Прыгучесть"><Slider value={draft.blob.bounce} min={0} max={1} step={0.02} onChange={(v) => update(['blob', 'bounce'], v)} format={(v) => `${Math.round(v * 100)}%`} /></Row>
            <Row label="Гравитация"><Slider value={draft.blob.gravity} min={0} max={1.2} step={0.02} onChange={(v) => update(['blob', 'gravity'], v)} format={(v) => v.toFixed(2)} /></Row>
            <Row label="Мягкость желе"><Slider value={draft.blob.softness} min={0} max={1.6} step={0.05} onChange={(v) => update(['blob', 'softness'], v)} format={(v) => v.toFixed(2)} /></Row>
            <Row label="Отступ от края"><Slider value={draft.blob.margin} min={0} max={60} step={1} onChange={(v) => update(['blob', 'margin'], v)} format={(v) => `${v}px`} /></Row>
            <Row label="Физика включена"><Toggle checked={draft.blob.physics} onChange={(v) => update(['blob', 'physics'], v)} /></Row>
            <Row label="Закрепить на месте" hint="не отскакивает после отпускания"><Toggle checked={draft.blob.pinned} onChange={(v) => update(['blob', 'pinned'], v)} /></Row>
          </Section>
          <Section title="Внешний вид блоба" icon="🎨">
            <Row label="Прозрачность"><Slider value={draft.blob.opacity} min={0.3} max={1} step={0.02} onChange={(v) => update(['blob', 'opacity'], v)} format={(v) => `${Math.round(v * 100)}%`} /></Row>
            <Row label="Размер лица"><Slider value={draft.blob.faceScale} min={0.6} max={1.5} step={0.05} onChange={(v) => update(['blob', 'faceScale'], v)} format={(v) => `${v.toFixed(2)}×`} /></Row>
            <Row label="Частота моргания"><Slider value={draft.blob.blinkRate} min={0.3} max={3} step={0.1} onChange={(v) => update(['blob', 'blinkRate'], v)} format={(v) => `${v.toFixed(1)}×`} /></Row>
            <Row label="Предмет эмоции"><Toggle checked={draft.blob.showAccessory} onChange={(v) => update(['blob', 'showAccessory'], v)} /></Row>
            <Row label="Верхний цвет"><input className="color-input" type="color" value={draft.blob.colorTop} onChange={(e) => update(['blob', 'colorTop'], e.target.value)} /></Row>
            <Row label="Нижний цвет"><input className="color-input" type="color" value={draft.blob.colorBottom} onChange={(e) => update(['blob', 'colorBottom'], e.target.value)} /></Row>
            <div className="preset-row">
              {BLOB_PRESETS.map(([top, bottom]) => (
                <button key={top} className="color-preset" style={{ background: `linear-gradient(135deg, ${top}, ${bottom})` }} onClick={() => {
                  const next = JSON.parse(JSON.stringify(draft)) as Settings;
                  next.blob.colorTop = top;
                  next.blob.colorBottom = bottom;
                  setDraft(next);
                  onChange({ blob: { colorTop: top, colorBottom: bottom } });
                }} />
              ))}
            </div>
          </Section>
          <Section title="Поведение окна" icon="🪟">
            <Row label="Всегда сверху"><Toggle checked={draft.blob.alwaysOnTop} onChange={(v) => update(['blob', 'alwaysOnTop'], v)} /></Row>
            <Row label="Прозрачное для кликов" hint="блоб будет только рисоваться, перетаскивать можно через настройки"><Toggle checked={draft.blob.clickThrough} onChange={(v) => update(['blob', 'clickThrough'], v)} /></Row>
          </Section>
        </>}

        {tab === 'ui' && <>
          <Section title="Тема и стиль" icon="🌈">
            <Row label="Тема">
              <Select value={draft.ui.theme} options={[['system', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']]} onChange={(v) => update(['ui', 'theme'], v)} />
            </Row>
            <Row label="Акцентный цвет">
              <div className="accent-row">
                {ACCENTS.map((color) => <button key={color} className={`accent-dot${draft.ui.accent === color ? ' active' : ''}`} style={{ background: color }} onClick={() => update(['ui', 'accent'], color)} />)}
                <input className="color-input small" type="color" value={draft.ui.accent} onChange={(e) => update(['ui', 'accent'], e.target.value)} />
              </div>
            </Row>
            <Row label="Стеклянность"><Slider value={draft.ui.glass} min={0} max={1} step={0.05} onChange={(v) => update(['ui', 'glass'], v)} format={(v) => `${Math.round(v * 100)}%`} /></Row>
            <Row label="Масштаб интерфейса"><Slider value={draft.ui.uiScale} min={0.8} max={1.3} step={0.02} onChange={(v) => update(['ui', 'uiScale'], v)} format={(v) => `${Math.round(v * 100)}%`} /></Row>
            <Row label="Анимации"><Toggle checked={draft.ui.animations} onChange={(v) => update(['ui', 'animations'], v)} /></Row>
            <Row label="Показывать эмоцию в чате"><Toggle checked={draft.ui.showEmotionBadge} onChange={(v) => update(['ui', 'showEmotionBadge'], v)} /></Row>
            <Row label="Компактные сообщения"><Toggle checked={draft.ui.compactMessages} onChange={(v) => update(['ui', 'compactMessages'], v)} /></Row>
          </Section>
        </>}

        {tab === 'tools' && <>
          <Section title="Безопасность" icon="🛡️">
            <Row label="Инструменты"><Toggle checked={draft.tools.enabled} onChange={(v) => update(['tools', 'enabled'], v)} /></Row>
            <Row label="Спрашивать перед каждым действием" hint="ради безопасности это правило всегда включено"><span className="locked-badge">🔒 Всегда</span></Row>
            <Row label="Время на подтверждение"><Slider value={draft.tools.confirmTimeout} min={10} max={300} step={5} onChange={(v) => update(['tools', 'confirmTimeout'], v)} format={(v) => `${v} сек`} /></Row>
            <p className="hint-text danger">Блоб не умеет удалять файлы, запускать команды и изменять систему. Любое действие (скриншот, клик, клавиши, запуск программы) произойдёт только после вашего «Разрешить».</p>
          </Section>
          <Section title="Разрешённые программы" icon="📦">
            <Row label="Белый список" hint="через запятую">
              <input className="input" value={draft.tools.allowedApps.join(', ')} onChange={(e) => update(['tools', 'allowedApps'], e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
            </Row>
            <p className="hint-text">Доступны: notepad, calc, explorer, msedge, chrome, firefox, code, spotify, discord. Команды cmd/powershell и системные утилиты заблокированы.</p>
          </Section>
          <Section title="Скриншоты" icon="📷">
            <Row label="Качество"><Slider value={draft.tools.screenshotScale} min={0.5} max={2} step={0.1} onChange={(v) => update(['tools', 'screenshotScale'], v)} format={(v) => `${v.toFixed(1)}×`} /></Row>
          </Section>
        </>}

        {tab === 'general' && <>
          <Section title="Запуск и горячие клавиши" icon="🚀">
            <Row label="Запускать при входе в Windows"><Toggle checked={draft.general.startAtLogin} onChange={(v) => update(['general', 'startAtLogin'], v)} /></Row>
            <Row label="Горячая клавиша" hint="показать/скрыть чат"><input className="input" value={draft.general.hotkey} onChange={(e) => update(['general', 'hotkey'], e.target.value)} spellCheck={false} /></Row>
            <Row label="Клик по блобу открывает чат"><Toggle checked={draft.general.showChatOnClick} onChange={(v) => update(['general', 'showChatOnClick'], v)} /></Row>
            <Row label="Звук при запуске"><Toggle checked={draft.general.soundOnLaunch} onChange={(v) => update(['general', 'soundOnLaunch'], v)} /></Row>
          </Section>
          <Section title="О приложении" icon="💛">
            <p className="hint-text">Blob v{version} · локальный ИИ-помощник с физикой, эмоциями и безопасными инструментами. Все данные и ключ хранятся только на вашем компьютере.</p>
            <div className="button-row">
              <button className="primary-button small" onClick={() => window.blob.toggleChat()}>💬 В чат</button>
              <button className="secondary-button small" onClick={resetAll}>↺ Сбросить настройки</button>
              <button className="secondary-button small" onClick={() => window.blob.quit()}>⏻ Выйти</button>
            </div>
          </Section>
          <p className="footer-note">Сделано с любовью к маленьким живым кружочкам 🟠</p>
        </>}
      </div>
    </div>
  );
}
