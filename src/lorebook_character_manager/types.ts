export type EntryRole = 'system' | 'assistant' | 'user';
export type ApiSource = 'custom' | 'openai' | 'claude' | 'xai' | 'deepseek';

export type ProfileRevision = {
  version: number;
  content: string;
  worldbookName: string;
  uid: number | null;
  createdAtFloor: number;
  disabledAtFloor: number | null;
  deleteAfterFloor: number | null;
};

export type CachedProfile = {
  chatId: string;
  name: string;
  content: string;
  depth: number;
  role: EntryRole;
  enabled: boolean;
  updatedAt: number;
  updatedAtFloor: number;
  autoUpdate: boolean;
  updateInterval: number;
  updateMode: 'silent' | 'aware';
  nextUpdateFloor: number;
  revisions: ProfileRevision[];
};

export type ManagerSettings = {
  apiMode: 'follow' | 'independent';
  apiKind: 'custom' | 'proxy';
  apiFormatVersion: 1;
  apiUrl: string;
  apiKey: string;
  apiSource: ApiSource;
  apiModel: string;
  proxyPreset: string;
  presetMode: 'follow' | 'independent';
  presetName: string;
  historyCount: number;
  includeSystemHistory: boolean;
  extractionMode: 'whitelist' | 'blacklist';
  extractTags: string;
  excludeTags: string;
  generationLorebooks: Record<string, number[]>;
  injectionTarget: 'chat' | 'worldbook';
  permanentWorldbook: string;
  injectionDepth: number;
  injectionRole: EntryRole;
  templateMode: 'builtin' | 'worldbook';
  templateWorldbook: string;
  templateEntryUid: number | null;
  template: string;
  profiles: Record<string, CachedProfile>;
};

export type ManagerRuntime = {
  worldbookName: string | null;
  activeChatId: string | null;
};
