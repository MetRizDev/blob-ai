export type ProviderId = 'openai' | 'openrouter' | 'groq' | 'deepseek' | 'custom';
export type VoiceMode = 'off' | 'speech' | 'undertale';
export type UndertalePack = 'classic' | 'sans' | 'papyrus' | 'flowey';
export type Persona = 'cute' | 'friendly' | 'professional' | 'sarcastic' | 'calm';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface ApiSettings {
  provider: ProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
  imageEnabled: boolean;
  imageModel: string;
  imageSize: string;
  systemPrompt: string;
}

export interface VoiceSettings {
  mode: VoiceMode;
  voiceURI: string;
  rate: number;
  pitch: number;
  volume: number;
  autoSpeak: boolean;
  pack: UndertalePack;
}

export interface BlobSettings {
  size: number;
  opacity: number;
  bounce: number;
  gravity: number;
  softness: number;
  pinned: boolean;
  physics: boolean;
  margin: number;
  alwaysOnTop: boolean;
  clickThrough: boolean;
  colorTop: string;
  colorBottom: string;
  faceScale: number;
  showAccessory: boolean;
  blinkRate: number;
}

export interface UiSettings {
  theme: ThemeMode;
  accent: string;
  uiScale: number;
  glass: number;
  animations: boolean;
  showEmotionBadge: boolean;
  compactMessages: boolean;
}

export interface ToolSettings {
  enabled: boolean;
  confirmTimeout: number;
  allowedApps: string[];
  screenshotScale: number;
  askEveryTime: boolean;
}

export interface GeneralSettings {
  startAtLogin: boolean;
  hotkey: string;
  showChatOnClick: boolean;
  soundOnLaunch: boolean;
  language: string;
}

export interface Settings {
  version: number;
  assistantName: string;
  userName: string;
  persona: Persona;
  api: ApiSettings;
  voice: VoiceSettings;
  blob: BlobSettings;
  ui: UiSettings;
  tools: ToolSettings;
  general: GeneralSettings;
}

export interface ChatRoleMessage {
  role: 'user' | 'assistant';
  content: any;
}

export interface ParsedTool {
  type: string;
  [key: string]: any;
}

export interface ParsedAI {
  text: string;
  emotion?: string;
  tools: ParsedTool[];
  imagePrompt?: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'done' | 'blocked' | 'error';

export interface ToolApproval {
  id: string;
  type: string;
  description: string;
  payload: Record<string, any>;
  status: ApprovalStatus;
  result?: string;
  dangerous?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  raw?: string;
  emotion?: string;
  time: number;
  pending?: boolean;
  error?: boolean;
  image?: { dataUrl: string; prompt: string };
  attachment?: { dataUrl: string; name: string };
  tools?: ToolApproval[];
}

export interface ToolRequest {
  id: string;
  type: string;
  description: string;
  payload: Record<string, any>;
  dangerous: boolean;
}

export interface ToolResult {
  id: string;
  ok: boolean;
  message: string;
  data?: any;
}

export interface ApiPreset {
  id: ProviderId;
  label: string;
  baseUrl: string;
  model: string;
  imageModel: string;
  keyHint: string;
}
