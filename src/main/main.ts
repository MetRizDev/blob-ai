import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  nativeImage,
  screen,
  Tray
} from 'electron';
import { deepMerge } from '../shared/settings';
import { loadSettings, saveSettings } from './store';
import { registerIpc } from './ipc';
import type { Settings } from '../shared/types';

let settings: Settings = loadSettings();
let overlayWindow: BrowserWindow | null = null;
let chatWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const preload = path.join(__dirname, 'preload.js');
const devUrl = process.env.VITE_DEV_SERVER_URL || '';

function pageUrl(hash: string): string {
  if (devUrl) return `${devUrl.replace(/\/$/, '')}/#${hash}`;
  return `${pathToFileURL(path.join(__dirname, '../../dist/index.html')).href}#${hash}`;
}

function broadcast(channel: string, payload?: any): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload);
  }
}

function createOverlay(): void {
  const area = screen.getPrimaryDisplay().workArea;
  overlayWindow = new BrowserWindow({
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: settings.blob.alwaysOnTop,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadURL(pageUrl('overlay'));
  overlayWindow.on('closed', () => (overlayWindow = null));
}

function updateOverlayBounds(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const area = screen.getPrimaryDisplay().workArea;
  overlayWindow.setBounds({ x: area.x, y: area.y, width: area.width, height: area.height });
}

function createChat(show = true): BrowserWindow {
  if (chatWindow && !chatWindow.isDestroyed()) {
    if (show) {
      chatWindow.show();
      chatWindow.focus();
    }
    return chatWindow;
  }

  chatWindow = new BrowserWindow({
    width: 456,
    height: 780,
    minWidth: 372,
    minHeight: 520,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: settings.blob.alwaysOnTop,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  chatWindow.loadURL(pageUrl('chat'));
  chatWindow.once('ready-to-show', () => {
    if (show && chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.show();
      chatWindow.focus();
    }
  });
  chatWindow.on('closed', () => (chatWindow = null));
  return chatWindow;
}

function openChat(): void {
  createChat(true);
}

function hideChat(): void {
  if (chatWindow && !chatWindow.isDestroyed()) chatWindow.hide();
}

function toggleChat(): void {
  if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible()) hideChat();
  else openChat();
}

function openSettings(): void {
  const window = createChat(true);
  const navigate = () => setTimeout(() => {
    if (!window.isDestroyed()) window.webContents.send('navigate:settings');
  }, 200);
  if (window.webContents.isLoading()) window.webContents.once('did-finish-load', navigate);
  else navigate();
}

function updateTrayMenu(): void {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '💬 Открыть чат', click: () => openChat() },
      { label: '⚙️ Настройки', click: () => openSettings() },
      {
        label: settings.blob.pinned ? '📌 Открепить блоба' : '📌 Закрепить блоба',
        click: () => setSettings({ blob: { pinned: !settings.blob.pinned } })
      },
      { type: 'separator' },
      { label: '❌ Выйти', click: () => app.quit() }
    ])
  );
}

function createTray(): void {
  const iconPath = path.join(app.getAppPath(), 'build', 'icon.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 })
    : nativeImage.createEmpty();
  try {
    tray = new Tray(icon);
    tray.setToolTip('Blob — твой милый помощник');
    tray.on('click', () => toggleChat());
    updateTrayMenu();
  } catch (error) {
    console.warn('[blob] трей не создан:', error);
  }
}

function applySettings(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setAlwaysOnTop(settings.blob.alwaysOnTop);
    if (settings.blob.clickThrough) overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  }
  if (chatWindow && !chatWindow.isDestroyed()) chatWindow.setAlwaysOnTop(settings.blob.alwaysOnTop);

  try {
    app.setLoginItemSettings({ openAtLogin: Boolean(settings.general.startAtLogin) });
  } catch (_) {
    /* в portable-режиме может быть недоступно */
  }

  globalShortcut.unregisterAll();
  if (settings.general.hotkey) {
    try {
      globalShortcut.register(settings.general.hotkey, () => toggleChat());
    } catch (error) {
      console.warn('[blob] не удалось зарегистрировать хоткей:', error);
    }
  }
  updateTrayMenu();
}

function setSettings(patch: any): Settings {
  settings = deepMerge(settings, patch || {});
  saveSettings(settings);
  applySettings();
  broadcast('settings:changed', settings);
  return settings;
}

function setOverlayIgnore(ignore: boolean): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayWindow.setIgnoreMouseEvents(settings.blob.clickThrough || ignore, { forward: true });
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => openChat());

  app.whenReady().then(() => {
    registerIpc({
      getSettings: () => settings,
      setSettings,
      sendToChat: (channel, payload) => broadcast(channel, payload),
      broadcast,
      setOverlayIgnore,
      openChat,
      hideChat,
      toggleChat,
      openSettings,
      minimizeChat: () => {
        if (chatWindow && !chatWindow.isDestroyed()) chatWindow.minimize();
      },
      quit: () => app.quit()
    });

    createOverlay();
    createChat(true);
    createTray();
    applySettings();

    screen.on('display-metrics-changed', updateOverlayBounds);
    screen.on('display-added', updateOverlayBounds);
    screen.on('display-removed', updateOverlayBounds);
  });

  app.on('window-all-closed', () => {
    // Блоб живёт в трее даже когда чат закрыт
  });

  app.on('before-quit', () => {
    globalShortcut.unregisterAll();
    if (tray && !tray.isDestroyed()) tray.destroy();
  });
}
