import { ipcMain } from 'electron';
import { askAI, generateImage } from './ai';
import { initTools, requestTool, respondTool, takeScreenshot } from './tools';
import { resetSettings } from './store';
import type { ChatRoleMessage, Settings } from '../shared/types';

export interface IpcContext {
  getSettings: () => Settings;
  setSettings: (patch: any) => Settings;
  sendToChat: (channel: string, payload: any) => void;
  broadcast: (channel: string, payload: any) => void;
  setOverlayIgnore: (ignore: boolean) => void;
  openChat: () => void;
  hideChat: () => void;
  toggleChat: () => void;
  openSettings: () => void;
  minimizeChat: () => void;
  quit: () => void;
}

function message(error: any): string {
  return error?.message || String(error);
}

export function registerIpc(ctx: IpcContext): void {
  initTools(ctx.sendToChat, ctx.getSettings);

  ipcMain.handle('settings:get', () => ctx.getSettings());
  ipcMain.handle('settings:set', (_event, patch) => ctx.setSettings(patch));
  ipcMain.handle('settings:reset', () => {
    const fresh = resetSettings();
    ctx.setSettings(fresh);
    return ctx.getSettings();
  });

  ipcMain.handle('ai:ask', async (event, messages: ChatRoleMessage[]) => {
    const wc = event.sender;
    try {
      const result = await askAI(ctx.getSettings(), messages || [], (delta) => {
        if (!wc.isDestroyed()) wc.send('ai:chunk', delta);
      });
      ctx.broadcast('ai:done', result.parsed);
      return { ok: true, raw: result.raw, parsed: result.parsed };
    } catch (error) {
      const text = message(error);
      if (!wc.isDestroyed()) wc.send('ai:error', text);
      return { ok: false, error: text };
    }
  });

  ipcMain.handle('ai:image', async (_event, prompt: string) => {
    try {
      const dataUrl = await generateImage(ctx.getSettings(), String(prompt || ''));
      return { ok: true, dataUrl };
    } catch (error) {
      return { ok: false, error: message(error) };
    }
  });

  ipcMain.handle('tool:run', (_event, type: string, payload: any) => {
    requestTool(String(type), payload || {});
    return true;
  });

  ipcMain.handle('tool:respond', (_event, id: string, approved: boolean) => {
    respondTool(id, Boolean(approved));
    return true;
  });

  ipcMain.handle('tool:screenshot', async () => {
    try {
      const dataUrl = await takeScreenshot(ctx.getSettings().tools.screenshotScale);
      return { ok: true, dataUrl };
    } catch (error) {
      return { ok: false, error: message(error) };
    }
  });

  ipcMain.handle('overlay:ignore', (_event, ignore: boolean) => ctx.setOverlayIgnore(Boolean(ignore)));
  ipcMain.handle('window:openChat', () => ctx.openChat());
  ipcMain.handle('window:hideChat', () => ctx.hideChat());
  ipcMain.handle('window:toggleChat', () => ctx.toggleChat());
  ipcMain.handle('window:openSettings', () => ctx.openSettings());
  ipcMain.handle('window:minimize', () => ctx.minimizeChat());
  ipcMain.handle('window:close', () => ctx.hideChat());
  ipcMain.handle('app:quit', () => ctx.quit());
  ipcMain.handle('app:version', () => require('../../package.json').version);
}
