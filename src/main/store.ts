import fs from 'node:fs';
import path from 'node:path';
import { app, safeStorage } from 'electron';
import { DEFAULT_SETTINGS, mergeSettings } from '../shared/settings';
import type { Settings } from '../shared/types';

const FILE_NAME = 'settings.json';
const PREFIX = 'enc:v1:';

function filePath(): string {
  return path.join(app.getPath('userData'), FILE_NAME);
}

function decode(value: any): string {
  if (typeof value !== 'string') return '';
  if (!value.startsWith(PREFIX)) return value;
  try {
    if (!safeStorage.isEncryptionAvailable()) return '';
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
    return safeStorage.decryptString(raw);
  } catch (_) {
    return '';
  }
}

function encode(value: string): string {
  if (!value) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return PREFIX + safeStorage.encryptString(value).toString('base64');
    }
  } catch (_) {
    /* падаем назад к открытому хранению */
  }
  return value;
}

export function loadSettings(): Settings {
  try {
    const file = filePath();
    if (!fs.existsSync(file)) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const merged = mergeSettings(parsed);
    merged.api.apiKey = decode(parsed?.api?.apiKey);
    return merged;
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    const file = filePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const toWrite = { ...settings, api: { ...settings.api, apiKey: encode(settings.api.apiKey) } };
    fs.writeFileSync(file, JSON.stringify(toWrite, null, 2), 'utf8');
  } catch (error) {
    console.error('[blob] не удалось сохранить настройки:', error);
  }
}

export function resetSettings(): Settings {
  const fresh: Settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  saveSettings(fresh);
  return fresh;
}
