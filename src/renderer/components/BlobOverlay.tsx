import React, { useEffect, useRef, useState } from 'react';
import { getEmotion } from '../../shared/emotions';
import { DEFAULT_SETTINGS } from '../../shared/settings';
import type { MouthStyle } from '../../shared/emotions';
import type { Settings } from '../../shared/types';

const MOUTH_PATHS: Record<MouthStyle, string> = {
  smile: 'M12 10 Q40 34 68 10',
  grin: 'M10 8 Q40 40 70 8',
  open: 'M22 8 Q40 42 58 8 Z',
  o: 'M40 8 a10 12 0 1 0 0.1 0',
  sad: 'M14 30 Q40 12 66 30',
  flat: 'M18 21 L62 21',
  wave: 'M12 20 Q25 8 38 20 T66 20',
  tongue: 'M14 9 Q40 34 66 9 M31 27 Q40 41 49 27',
  cat: 'M22 20 Q30 31 38 20 Q46 31 54 20',
  shock: 'M40 6 a12 16 0 1 0 0.1 0'
};

interface Vec {
  x: number;
  y: number;
}

export default function BlobOverlay() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const [emotionId, setEmotionId] = useState('happy');
  const [blinking, setBlinking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [render, setRender] = useState({ x: 0, y: 0, sx: 1, sy: 1, rot: 0 });

  const pos = useRef<Vec>({ x: 0, y: 0 });
  const vel = useRef<Vec>({ x: 0, y: 0 });
  const wobble = useRef<Vec>({ x: 0, y: 0 });
  const dragging = useRef(false);
  const moved = useRef(false);
  const offset = useRef<Vec>({ x: 0, y: 0 });
  const lastPointer = useRef<Vec>({ x: 0, y: 0 });
  const ignoring = useRef(false);
  const initialized = useRef(false);

  const size = settings.blob.size;

  useEffect(() => {
    const apply = (value: Settings) => {
      settingsRef.current = value;
      setSettings(value);
      const radius = value.blob.size;
      pos.current.x = Math.max(0, Math.min(window.innerWidth - radius, pos.current.x));
      pos.current.y = Math.max(0, Math.min(window.innerHeight - radius, pos.current.y));
      if (!initialized.current) {
        pos.current.x = Math.max(0, window.innerWidth - radius - value.blob.margin);
        pos.current.y = Math.max(0, window.innerHeight - radius - value.blob.margin);
        initialized.current = true;
      }
    };

    window.blob.getSettings().then(apply).catch(() => undefined);
    const offSettings = window.blob.on('settings:changed', (value: Settings) => apply(value));
    const offEmotion = window.blob.on('ai:done', (payload: any) => {
      if (payload?.emotion) setEmotionId(payload.emotion);
    });
    return () => {
      offSettings();
      offEmotion();
    };
  }, []);

  useEffect(() => {
    const emotion = getEmotion(emotionId);
    const period = Math.max(900, 3400 / (settings.blob.blinkRate || 1) / (emotion.blink || 1));
    let closeTimer: any;
    const timer = setInterval(() => {
      setBlinking(true);
      closeTimer = setTimeout(() => setBlinking(false), 135);
    }, period);
    return () => {
      clearInterval(timer);
      clearTimeout(closeTimer);
    };
  }, [emotionId, settings.blob.blinkRate]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const s = settingsRef.current;
      const p = pos.current;
      const v = vel.current;
      const w = wobble.current;

      if (!dragging.current && s.blob.physics && !s.blob.pinned) {
        v.y += s.blob.gravity;
        v.x *= 0.992;
        v.y *= 0.992;
        p.x += v.x;
        p.y += v.y;

        const maxX = window.innerWidth - s.blob.size;
        const maxY = window.innerHeight - s.blob.size;
        const bounce = s.blob.bounce;
        if (p.x < 0) {
          p.x = 0;
          v.x = Math.abs(v.x) * bounce;
          w.x += 0.16;
        } else if (p.x > maxX) {
          p.x = maxX;
          v.x = -Math.abs(v.x) * bounce;
          w.x -= 0.16;
        }
        if (p.y < 0) {
          p.y = 0;
          v.y = Math.abs(v.y) * bounce;
          w.y += 0.16;
        } else if (p.y > maxY) {
          p.y = maxY;
          v.y = -Math.abs(v.y) * bounce;
          w.y -= 0.16;
          if (Math.abs(v.y) < 0.12) v.y = 0;
        }
      }

      w.x *= 0.88;
      w.y *= 0.88;
      const softness = s.blob.softness;
      setRender({
        x: p.x,
        y: p.y,
        sx: Math.max(0.72, 1 + w.x * softness),
        sy: Math.max(0.72, 1 - w.x * softness + w.y * softness * 0.3),
        rot: w.x * 9
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const setIgnore = (value: boolean) => {
    if (ignoring.current === value) return;
    ignoring.current = value;
    window.blob.setOverlayIgnore(value).catch(() => undefined);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragging.current = true;
    moved.current = false;
    setMenuOpen(false);
    setIgnore(false);
    offset.current = { x: event.clientX - pos.current.x, y: event.clientY - pos.current.y };
    lastPointer.current = { x: event.clientX, y: event.clientY };
    vel.current = { x: 0, y: 0 };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) {
      const x = event.clientX - offset.current.x;
      const y = event.clientY - offset.current.y;
      const maxX = window.innerWidth - size;
      const maxY = window.innerHeight - size;
      const nextX = Math.max(0, Math.min(maxX, x));
      const nextY = Math.max(0, Math.min(maxY, y));
      const pointerDeltaX = event.clientX - lastPointer.current.x;
      const pointerDeltaY = event.clientY - lastPointer.current.y;
      if (Math.abs(pointerDeltaX) + Math.abs(pointerDeltaY) > 2) moved.current = true;
      vel.current = {
        x: (nextX - pos.current.x) * 0.7 + pointerDeltaX * 0.3,
        y: (nextY - pos.current.y) * 0.7 + pointerDeltaY * 0.3
      };
      wobble.current.x = Math.max(-0.22, Math.min(0.22, vel.current.x * 0.014));
      wobble.current.y = Math.max(-0.22, Math.min(0.22, vel.current.y * 0.014));
      pos.current = { x: nextX, y: nextY };
      lastPointer.current = { x: event.clientX, y: event.clientY };
      return;
    }

    const cx = pos.current.x + size / 2;
    const cy = pos.current.y + size / 2;
    const distance = Math.hypot(event.clientX - cx, event.clientY - cy);
    setIgnore(!menuOpen && distance > size * 0.6);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch (_) {
      /* уже отпущено */
    }
    if (settingsRef.current.blob.pinned || !settingsRef.current.blob.physics) {
      vel.current = { x: 0, y: 0 };
    } else {
      const speed = Math.hypot(vel.current.x, vel.current.y);
      if (speed > 26) {
        vel.current.x = (vel.current.x / speed) * 26;
        vel.current.y = (vel.current.y / speed) * 26;
      }
    }
    if (!moved.current) {
      if (settingsRef.current.general.showChatOnClick) window.blob.openChat().catch(() => undefined);
      else window.blob.toggleChat().catch(() => undefined);
    }
  };

  const togglePin = () => {
    const next = !settingsRef.current.blob.pinned;
    window.blob.setSettings({ blob: { pinned: next } }).catch(() => undefined);
    setMenuOpen(false);
  };

  const downloadScreenshot = async () => {
    const result = await window.blob.screenshot();
    setMenuOpen(false);
    if (result.ok && result.dataUrl) {
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = `blob-${Date.now()}.png`;
      link.click();
    }
  };

  useEffect(() => {
    const close = () => setMenuOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const emotion = getEmotion(emotionId);
  const leftEye = emotion.eyes === 'wink' ? 'normal' : emotion.eyes;
  const rightEye = emotion.eyes === 'wink' ? 'wink-eye' : emotion.eyes;
  const filledMouth = ['open', 'o', 'shock'].includes(emotion.mouth);
  const menuLeft = Math.max(8, Math.min(window.innerWidth - 224, render.x - 12));
  const menuTop = render.y > 268 ? render.y - 258 : Math.min(window.innerHeight - 268, render.y + size + 10);

  return (
    <div className="overlay-root">
      <div
        className={`blob-hit${menuOpen ? ' menu-active' : ''}`}
        style={{
          width: size,
          height: size,
          transform: `translate3d(${render.x}px, ${render.y}px, 0) scale(${render.sx}, ${render.sy}) rotate(${render.rot}deg)`
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDown(event);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => window.blob.openSettings().catch(() => undefined)}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuOpen(true);
          setIgnore(false);
        }}
      >
        <div
          className="blob-body"
          style={{
            background: `radial-gradient(circle at 34% 26%, #fff8d9 0%, ${settings.blob.colorTop} 34%, ${settings.blob.colorBottom} 100%)`,
            filter: `hue-rotate(${emotion.tint}deg)`,
            opacity: settings.blob.opacity
          }}
        >
          <div className="blob-shine" />
          <div className="blob-face" style={{ transform: `scale(${settings.blob.faceScale})` }}>
            <div className={`blob-eyes brow-${emotion.brow}`}>
              <div className={`blob-eye eye-${leftEye}${blinking ? ' is-blinking' : ''}`}>
                {leftEye === 'heart' ? '♥' : leftEye === 'spiral' ? '◉' : leftEye === 'x' ? '✕' : leftEye === 'sparkle' ? '✦' : <span className="blob-pupil" />}
              </div>
              <div className={`blob-eye eye-${rightEye}${blinking ? ' is-blinking' : ''}`}>
                {rightEye === 'heart' ? '♥' : rightEye === 'spiral' ? '◉' : rightEye === 'x' ? '✕' : rightEye === 'sparkle' ? '✦' : rightEye === 'wink-eye' ? '' : <span className="blob-pupil" />}
              </div>
            </div>
            <svg className="blob-mouth" viewBox="0 0 80 44" aria-hidden="true">
              <path
                d={MOUTH_PATHS[emotion.mouth]}
                fill={filledMouth ? 'rgba(58, 24, 8, 0.92)' : 'none'}
                stroke="rgba(58, 24, 8, 0.92)"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {settings.blob.showAccessory && <div className="blob-accessory">{emotion.emoji}</div>}
          <div className="blob-shadow" />
        </div>
      </div>

      {menuOpen && (
        <div className="blob-menu glass" style={{ left: menuLeft, top: menuTop }} onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => { setMenuOpen(false); window.blob.openChat(); }}>
            <span>💬</span> Открыть чат
          </button>
          <button onClick={() => { setMenuOpen(false); window.blob.openSettings(); }}>
            <span>⚙️</span> Настройки
          </button>
          <button onClick={togglePin}>
            <span>📌</span> {settings.blob.pinned ? 'Открепить' : 'Закрепить на месте'}
          </button>
          <button onClick={downloadScreenshot}>
            <span>📷</span> Скриншот
          </button>
          <button onClick={() => { setMenuOpen(false); window.blob.quit(); }}>
            <span>⏻</span> Выйти
          </button>
        </div>
      )}
    </div>
  );
}
