import type {
  ChatRoleMessage,
  ParsedAI,
  Settings,
  ToolRequest,
  ToolResult
} from '../shared/types';

export interface BlobAPI {
  getSettings(): Promise<Settings>;
  setSettings(patch: any): Promise<Settings>;
  resetSettings(): Promise<Settings>;
  ask(messages: ChatRoleMessage[]): Promise<{ ok: boolean; raw?: string; parsed?: ParsedAI; error?: string }>;
  generateImage(prompt: string): Promise<{ ok: boolean; dataUrl?: string; error?: string }>;
  screenshot(): Promise<{ ok: boolean; dataUrl?: string; error?: string }>;
  runTool(type: string, payload?: any): Promise<boolean>;
  respondTool(id: string, approved: boolean): Promise<boolean>;
  setOverlayIgnore(ignore: boolean): Promise<void>;
  openChat(): Promise<void>;
  hideChat(): Promise<void>;
  toggleChat(): Promise<void>;
  openSettings(): Promise<void>;
  minimize(): Promise<void>;
  closeWindow(): Promise<void>;
  quit(): Promise<void>;
  version(): Promise<string>;
  on(channel: string, callback: (payload: any) => void): () => void;
}

declare global {
  interface Window {
    blob: BlobAPI;
  }
}
