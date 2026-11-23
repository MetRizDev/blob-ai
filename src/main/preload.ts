import { contextBridge, ipcRenderer } from 'electron';
import type { ChatRoleMessage, ParsedAI, Settings, ToolRequest, ToolResult } from '../shared/types';

type Listener = (payload: any) => void;

const ALLOWED_CHANNELS = [
  'ai:chunk',
  'ai:done',
  'ai:error',
  'tool:request',
  'tool:result',
  'settings:changed',
  'navigate:settings'
];

const api = {
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: any): Promise<Settings> => ipcRenderer.invoke('settings:set', patch),
  resetSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:reset'),

  ask: (messages: ChatRoleMessage[]): Promise<{ ok: boolean; raw?: string; parsed?: ParsedAI; error?: string }> =>
    ipcRenderer.invoke('ai:ask', messages),
  generateImage: (prompt: string): Promise<{ ok: boolean; dataUrl?: string; error?: string }> =>
    ipcRenderer.invoke('ai:image', prompt),
  screenshot: (): Promise<{ ok: boolean; dataUrl?: string; error?: string }> =>
    ipcRenderer.invoke('tool:screenshot'),
  runTool: (type: string, payload?: any): Promise<boolean> => ipcRenderer.invoke('tool:run', type, payload || {}),
  respondTool: (id: string, approved: boolean): Promise<boolean> =>
    ipcRenderer.invoke('tool:respond', id, approved),

  setOverlayIgnore: (ignore: boolean): Promise<void> => ipcRenderer.invoke('overlay:ignore', ignore),
  openChat: (): Promise<void> => ipcRenderer.invoke('window:openChat'),
  hideChat: (): Promise<void> => ipcRenderer.invoke('window:hideChat'),
  toggleChat: (): Promise<void> => ipcRenderer.invoke('window:toggleChat'),
  openSettings: (): Promise<void> => ipcRenderer.invoke('window:openSettings'),
  minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
  quit: (): Promise<void> => ipcRenderer.invoke('app:quit'),
  version: (): Promise<string> => ipcRenderer.invoke('app:version'),

  on: (channel: string, callback: Listener): (() => void) => {
    if (!ALLOWED_CHANNELS.includes(channel)) return () => undefined;
    const listener = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
};

contextBridge.exposeInMainWorld('blob', api);
