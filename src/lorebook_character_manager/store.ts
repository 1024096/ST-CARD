import { klona } from 'klona';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { z } from 'zod';
import type { ManagerSettings } from './types';

const DEFAULT_TEMPLATE = `你是一名严谨的原创角色设定师。请综合聊天片段与用户要求，创建一份可长期作为世界书资料使用的人物档案。

要求：
1. 角色必须原创，设定自洽，能直接用于后续剧情。
2. 保留聊天中已有的事实，不擅自改写关键关系。
3. 输出只包含 <character_profile>...</character_profile>。
4. 档案至少包括：姓名、身份、外貌、性格、经历、能力与限制、关系、目标、秘密、说话方式、剧情钩子。`;

const RevisionSchema = z.object({
  version: z.number().int().min(1),
  content: z.string(),
  worldbookName: z.string(),
  uid: z.number().int().nullable(),
  createdAtFloor: z.number().int().min(0),
  disabledAtFloor: z.number().int().min(0).nullable(),
  deleteAfterFloor: z.number().int().min(0).nullable(),
});

const ProfileSchema = z.object({
  chatId: z.string(),
  name: z.string(),
  content: z.string(),
  depth: z.number().int().min(0).max(999),
  role: z.enum(['system', 'assistant', 'user']),
  enabled: z.boolean(),
  updatedAt: z.number(),
  updatedAtFloor: z.number().int().min(0).default(0),
  autoUpdate: z.boolean().default(false),
  updateInterval: z.number().int().min(1).max(1000).default(20),
  updateMode: z.enum(['silent', 'aware']).default('aware'),
  nextUpdateFloor: z.number().int().min(0).default(0),
  revisions: z.array(RevisionSchema).default([]),
});

const SettingsSchema = z
  .object({
    apiMode: z.enum(['follow', 'independent']).default('follow'),
    apiKind: z.enum(['custom', 'proxy']).default('custom'),
    apiUrl: z.string().default(''),
    apiKey: z.string().default(''),
    apiSource: z.string().default('openai'),
    apiModel: z.string().default(''),
    proxyPreset: z.string().default(''),
    presetMode: z.enum(['follow', 'independent']).default('follow'),
    presetName: z.string().default(''),
    historyCount: z.number().int().min(0).max(1000).default(8),
    includeSystemHistory: z.boolean().default(false),
    extractionMode: z.enum(['whitelist', 'blacklist']).default('whitelist'),
    extractTags: z.string().default('content,novel,正文,maintext,story,response'),
    excludeTags: z
      .string()
      .default('think,thinking,reasoning,update,updatevariable,UpdateVariable,Analysis,JSONPatch,StatusBlock,status'),
    injectionDepth: z.number().int().min(0).max(999).default(4),
    injectionRole: z.enum(['system', 'assistant', 'user']).default('system'),
    templateMode: z.enum(['builtin', 'worldbook']).default('builtin'),
    templateWorldbook: z.string().default(''),
    templateEntryUid: z.number().int().nullable().default(null),
    template: z.string().default(DEFAULT_TEMPLATE),
    profiles: z.record(z.string(), ProfileSchema).default({}),
  })
  .prefault({});

export const useManagerStore = defineStore('lorebook-character-manager', () => {
  const parsed = SettingsSchema.parse(getVariables({ type: 'script', script_id: getScriptId() }));
  for (const profile of Object.values(parsed.profiles)) {
    if (!profile.nextUpdateFloor) profile.nextUpdateFloor = profile.updatedAtFloor + profile.updateInterval;
  }
  const settings = ref<ManagerSettings>(parsed);

  watch(settings, value => insertOrAssignVariables(klona(value), { type: 'script', script_id: getScriptId() }), {
    deep: true,
  });

  return { settings };
});
