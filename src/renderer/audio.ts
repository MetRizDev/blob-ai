import type { Settings, UndertalePack } from '../shared/types';

let context: AudioContext | null = null;

interface BlipPack {
  wave: OscillatorType;
  base: number;
  step: number;
  duration: number;
  gap: number;
  gain: number;
  detune: number;
}

const PACKS: Record<UndertalePack, BlipPack> = {
  classic: { wave: 'square', base: 240, step: 17, duration: 0.045, gap: 0.014, gain: 0.035, detune: 0 },
  sans: { wave: 'triangle', base: 150, step: 11, duration: 0.075, gap: 0.032, gain: 0.055, detune: -10 },
  papyrus: { wave: 'square', base: 430, step: 34, duration: 0.032, gap: 0.006, gain: 0.028, detune: 18 },
  flowey: { wave: 'sine', base: 310, step: 23, duration: 0.06, gap: 0.022, gain: 0.045, detune: 5 }
};

export function cleanForSpeech(text: string): string {
  return String(text || '')
    .replace(/\[emotion:[^\]]+\]/gi, '')
    .replace(/<<[\s\S]*?>>/g, '')
    .replace(/\*\*|__|`/g, '')
    .trim();
}

export function stopAll(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function speak(text: string, settings: Settings): void {
  const value = cleanForSpeech(text);
  if (!value) return;
  if (settings.voice.mode === 'undertale') {
    playUndertale(value, settings.voice.pack, settings.voice.volume);
    return;
  }
  if (settings.voice.mode !== 'speech' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value.slice(0, 600));
  const voices = window.speechSynthesis.getVoices();
  const chosen = voices.find((voice) => voice.voiceURI === settings.voice.voiceURI);
  if (chosen) utterance.voice = chosen;
  utterance.lang = chosen?.lang || (settings.general.language === 'ru' ? 'ru-RU' : 'en-US');
  utterance.rate = settings.voice.rate;
  utterance.pitch = settings.voice.pitch;
  utterance.volume = settings.voice.volume;
  window.speechSynthesis.speak(utterance);
}

export function playUndertale(text: string, packName: UndertalePack, volume = 0.8): void {
  const pack = PACKS[packName] || PACKS.classic;
  try {
    context = context || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    const start = context.currentTime + 0.02;
    const chars = Array.from(cleanForSpeech(text)).slice(0, 90);
    chars.forEach((char, index) => {
      if (char === ' ' || char === '\n') return;
      const osc = context!.createOscillator();
      const gain = context!.createGain();
      const code = char.charCodeAt(0);
      const semitone = (code + index) % 12;
      osc.type = pack.wave;
      osc.frequency.value = pack.base * Math.pow(2, semitone / 12);
      osc.detune.value = pack.detune + ((code % 5) - 2) * 4;
      const at = start + index * (pack.duration + pack.gap);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, pack.gain * volume), at + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + pack.duration);
      osc.connect(gain);
      gain.connect(context!.destination);
      osc.start(at);
      osc.stop(at + pack.duration + 0.01);
    });
  } catch (_) {
    /* звук — необязательная часть */
  }
}

export function previewVoice(settings: Settings): void {
  stopAll();
  speak('Привет! Я блоб, и я рядом.', settings);
}
