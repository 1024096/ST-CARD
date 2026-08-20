import type { CachedProfile, EntryRole, ManagerRuntime, ManagerSettings, ProfileRevision } from './types';

export const MANAGER_MARK = 'lorebook_character_manager';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/^```(?:xml|yaml|markdown|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseTagList(tagsText: string): string[] {
  return [
    ...new Set(
      tagsText
        .split(/[,，\s]+/)
        .map(tag => tag.trim().replace(/^<\/?|>$/g, ''))
        .filter(Boolean),
    ),
  ];
}

export function extractTaggedText(source: string, tagsText: string, fallbackToSource = true): string {
  const tags = parseTagList(tagsText);
  const blocks: { start: number; end: number; content: string }[] = [];
  for (const tag of tags) {
    const matches = [
      ...source.matchAll(new RegExp(`<${escapeRegExp(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, 'gi')),
    ];
    for (const match of matches) {
      blocks.push({ start: match.index, end: match.index + match[0].length, content: match[1] });
    }
  }
  if (!blocks.length) return fallbackToSource ? normalizeExtractedText(source) : '';
  blocks.sort((a, b) => a.start - b.start || b.end - a.end);
  const nonNested = blocks.filter(
    (block, index) => !blocks.slice(0, index).some(parent => block.start >= parent.start && block.end <= parent.end),
  );
  return normalizeExtractedText(nonNested.map(block => block.content).join('\n'));
}

function removeTaggedBlocks(source: string, tagsText: string): string {
  return normalizeExtractedText(
    parseTagList(tagsText).reduce(
      (text, tag) =>
        text.replace(new RegExp(`<${escapeRegExp(tag)}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${escapeRegExp(tag)}>`, 'gi'), ''),
      source,
    ),
  );
}

export function getHistoryMessages(count: number, includeSystem: boolean): ChatMessage[] {
  if (count === 0) return [];
  return getChatMessages('0-{{lastMessageId}}', { include_swipes: false, hide_state: 'unhidden' })
    .filter(message => includeSystem || message.role === 'user' || message.role === 'assistant')
    .slice(-count);
}

export type DetectedXmlTag = { name: string; count: number };

export function detectHistoryXmlTags(count: number, includeSystem: boolean): DetectedXmlTag[] {
  const detected = new Map<string, { name: string; count: number }>();
  const openingTag = /<([\p{L}_][\p{L}\p{N}_.:-]*)(?:\s[^<>]*?)?>/gu;
  const closingTag = /<\/([\p{L}_][\p{L}\p{N}_.:-]*)\s*>/gu;
  for (const message of getHistoryMessages(count, includeSystem)) {
    const closingNames = new Set([...message.message.matchAll(closingTag)].map(match => match[1].toLocaleLowerCase()));
    for (const match of message.message.matchAll(openingTag)) {
      if (match[0].endsWith('/>')) continue;
      const key = match[1].toLocaleLowerCase();
      if (!closingNames.has(key)) continue;
      const current = detected.get(key);
      detected.set(key, { name: current?.name ?? match[1], count: (current?.count ?? 0) + 1 });
    }
  }
  return [...detected.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function collectHistory(settings: ManagerSettings): string {
  if (settings.historyCount === 0) return '（未附加聊天历史）';
  const messages = getHistoryMessages(settings.historyCount, settings.includeSystemHistory);
  if (!messages.length) return '（当前聊天暂无可用记录）';
  const blocks = messages
    .map(message => {
      const content =
        settings.extractionMode === 'whitelist'
          ? extractTaggedText(message.message, settings.extractTags, false)
          : removeTaggedBlocks(message.message, settings.excludeTags);
      return content ? `[楼层 ${message.message_id} · ${message.role} / ${message.name}]\n${content}` : '';
    })
    .filter(Boolean);
  return blocks.length ? blocks.join('\n\n') : '（所选提取规则没有得到可用正文）';
}

function customApi(settings: ManagerSettings): CustomApiConfig | undefined {
  if (settings.apiMode === 'follow') return undefined;
  if (settings.apiKind === 'proxy') {
    return {
      proxy_preset: settings.proxyPreset.trim() || undefined,
      model: settings.apiModel.trim() || undefined,
    };
  }
  return {
    apiurl: settings.apiUrl.trim() || undefined,
    key: settings.apiKey.trim() || undefined,
    source: settings.apiSource.trim() || 'openai',
    model: settings.apiModel.trim() || undefined,
  };
}

function generationOptions(settings: ManagerSettings): Pick<GenerateConfig, 'preset_name' | 'custom_api'> {
  return {
    preset_name: settings.presetMode === 'follow' ? 'in_use' : settings.presetName || 'in_use',
    custom_api: customApi(settings),
  };
}

export async function generateProfile(
  settings: ManagerSettings,
  requirements: string,
  feedback = '',
  previous = '',
): Promise<string> {
  const history = collectHistory(settings);
  let template = settings.template;
  if (settings.templateMode === 'worldbook') {
    if (!settings.templateWorldbook || settings.templateEntryUid === null)
      throw Error('请先选择作为人物创建模板的世界书条目。');
    const templateEntry = (await getWorldbook(settings.templateWorldbook)).find(
      entry => entry.uid === settings.templateEntryUid,
    );
    if (!templateEntry) throw Error('选择的模板条目已不存在，请重新选择。');
    template = templateEntry.content;
  }
  const revision = previous
    ? `\n\n这是上一版档案：\n<previous_profile>\n${previous}\n</previous_profile>\n修改意见：${feedback || '请生成差异明显、质量更高的新版本。'}`
    : '';
  const result = await generate({
    ...generationOptions(settings),
    should_stream: false,
    should_silence: false,
    max_chat_history: 0,
    user_input: `${template}\n\n<chat_excerpt>\n${history}\n</chat_excerpt>\n\n<user_requirements>\n${requirements || '请根据现有剧情自由创作。'}\n</user_requirements>${revision}`,
  });
  if (typeof result !== 'string') throw Error('模型返回了工具调用，未返回人物档案文本。');
  return extractTaggedText(result, 'character_profile,人物档案');
}

export function managedEntry(
  profile: CachedProfile,
  revision: ProfileRevision,
  enabled: boolean,
): TypeFest.PartialDeep<WorldbookEntry> {
  return {
    name: `角色记忆 · ${profile.name || '未命名'} · v${revision.version}（更新于 ${revision.createdAtFloor} 楼）`,
    enabled,
    strategy: { type: 'constant' },
    position: { type: 'at_depth', role: profile.role, depth: profile.depth, order: 100 },
    content: revision.content,
    probability: 100,
    recursion: { prevent_incoming: true, prevent_outgoing: false, delay_until: null },
    extra: {
      [MANAGER_MARK]: true,
      chat_id: profile.chatId,
      profile_version: revision.version,
      updated_at_floor: revision.createdAtFloor,
      delete_after_floor: revision.deleteAfterFloor,
    },
  };
}

export async function removeManagedEntries(worldbookName: string | null): Promise<void> {
  if (!worldbookName || !getWorldbookNames().includes(worldbookName)) return;
  await deleteWorldbookEntries(worldbookName, entry => entry.extra?.[MANAGER_MARK] === true, { render: 'immediate' });
}

export async function restoreProfileForCurrentChat(
  profile: CachedProfile | undefined,
  runtime: ManagerRuntime,
): Promise<void> {
  runtime.activeChatId = SillyTavern.getCurrentChatId();
  runtime.worldbookName = getChatWorldbookName('current');
  if (!profile?.content || !profile.enabled) return;

  const currentFloor = Math.max(0, getLastMessageId());
  if (!profile.revisions.length) {
    profile.revisions.push({
      version: 1,
      content: profile.content,
      worldbookName: runtime.worldbookName ?? '',
      uid: null,
      createdAtFloor: profile.updatedAtFloor || currentFloor,
      disabledAtFloor: null,
      deleteAfterFloor: null,
    });
    profile.updatedAtFloor ||= currentFloor;
    profile.nextUpdateFloor ||= profile.updatedAtFloor + profile.updateInterval;
  }
  profile.revisions = profile.revisions.filter(
    revision => revision.deleteAfterFloor === null || currentFloor < revision.deleteAfterFloor,
  );

  if (!runtime.worldbookName) {
    const safeChatId = runtime.activeChatId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-40) || String(Date.now());
    runtime.worldbookName = await getOrCreateChatWorldbook('current', `LCM-临时-${safeChatId}`);
  }
  await removeManagedEntries(runtime.worldbookName);
  const activeVersion = profile.revisions.at(-1)?.version;
  const { new_entries } = await createWorldbookEntries(
    runtime.worldbookName,
    profile.revisions.map(revision => {
      revision.worldbookName = runtime.worldbookName!;
      revision.uid = null;
      return managedEntry(profile, revision, profile.enabled && revision.version === activeVersion);
    }),
    { render: 'immediate' },
  );
  new_entries.forEach((entry, index) => (profile.revisions[index].uid = entry.uid));
}

async function ensureCurrentWorldbook(runtime: ManagerRuntime): Promise<string> {
  runtime.activeChatId = SillyTavern.getCurrentChatId();
  runtime.worldbookName = getChatWorldbookName('current');
  if (!runtime.worldbookName) {
    const safeChatId = runtime.activeChatId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-40) || String(Date.now());
    runtime.worldbookName = await getOrCreateChatWorldbook('current', `LCM-临时-${safeChatId}`);
  }
  return runtime.worldbookName;
}

async function commitProfileRevision(
  profile: CachedProfile,
  content: string,
  floor: number,
  runtime: ManagerRuntime,
): Promise<void> {
  const worldbookName = await ensureCurrentWorldbook(runtime);
  if (!profile.revisions.length && profile.content) {
    profile.revisions.push({
      version: 1,
      content: profile.content,
      worldbookName,
      uid: null,
      createdAtFloor: profile.updatedAtFloor || floor,
      disabledAtFloor: null,
      deleteAfterFloor: null,
    });
    await restoreProfileForCurrentChat(profile, runtime);
  }

  const previous = profile.revisions.at(-1);
  const revision: ProfileRevision = {
    version: (previous?.version ?? 0) + 1,
    content,
    worldbookName,
    uid: null,
    createdAtFloor: floor,
    disabledAtFloor: null,
    deleteAfterFloor: null,
  };
  const { new_entries } = await createWorldbookEntries(worldbookName, [managedEntry(profile, revision, true)], {
    render: 'immediate',
  });
  revision.uid = new_entries[0].uid;

  if (previous) {
    previous.disabledAtFloor = floor;
    previous.deleteAfterFloor = floor + 10;
    try {
      await updateWorldbookWith(
        worldbookName,
        entries =>
          entries.map(entry =>
            entry.extra?.[MANAGER_MARK] === true &&
            entry.extra?.chat_id === profile.chatId &&
            entry.extra?.profile_version === previous.version
              ? { ...entry, enabled: false, extra: { ...entry.extra, delete_after_floor: previous.deleteAfterFloor } }
              : entry,
          ),
        { render: 'immediate' },
      );
    } catch (error) {
      await deleteWorldbookEntries(worldbookName, entry => entry.uid === revision.uid, { render: 'immediate' });
      previous.disabledAtFloor = null;
      previous.deleteAfterFloor = null;
      throw error;
    }
  }

  profile.revisions.push(revision);
  profile.content = content;
  profile.updatedAt = Date.now();
  profile.updatedAtFloor = floor;
  profile.nextUpdateFloor = floor + profile.updateInterval;
}

export async function saveTemporaryProfile(
  settings: ManagerSettings,
  name: string,
  content: string,
  depth: number,
  role: EntryRole,
  runtime: ManagerRuntime,
): Promise<CachedProfile> {
  const chatId = SillyTavern.getCurrentChatId();
  if (!chatId) throw Error('当前没有已打开的聊天文件。');
  const floor = Math.max(0, getLastMessageId());
  const existing = settings.profiles[chatId];
  const profile: CachedProfile = existing ?? {
    chatId,
    name: name.trim() || '未命名',
    content: '',
    depth,
    role,
    enabled: true,
    updatedAt: Date.now(),
    updatedAtFloor: floor,
    autoUpdate: false,
    updateInterval: 20,
    updateMode: 'aware',
    nextUpdateFloor: floor + 20,
    revisions: [],
  };
  profile.name = name.trim() || profile.name || '未命名';
  profile.depth = depth;
  profile.role = role;
  profile.enabled = true;
  settings.profiles[chatId] = profile;
  await commitProfileRevision(profile, content.trim(), floor, runtime);
  return profile;
}

async function deleteExpiredRevisions(profile: CachedProfile, currentFloor: number): Promise<void> {
  const expired = profile.revisions.filter(
    revision => revision.deleteAfterFloor !== null && currentFloor >= revision.deleteAfterFloor,
  );
  for (const revision of expired) {
    if (!getWorldbookNames().includes(revision.worldbookName)) continue;
    await deleteWorldbookEntries(
      revision.worldbookName,
      entry =>
        entry.extra?.[MANAGER_MARK] === true &&
        entry.extra?.chat_id === profile.chatId &&
        entry.extra?.profile_version === revision.version,
      { render: 'immediate' },
    );
  }
  profile.revisions = profile.revisions.filter(revision => !expired.includes(revision));
}

function collectHistoryAfterFloor(settings: ManagerSettings, floor: number): string {
  const messages = getChatMessages('0-{{lastMessageId}}', { include_swipes: false, hide_state: 'unhidden' })
    .filter(message => message.message_id > floor)
    .filter(message => settings.includeSystemHistory || message.role === 'user' || message.role === 'assistant');
  const blocks = messages
    .map(message => {
      const content =
        settings.extractionMode === 'whitelist'
          ? extractTaggedText(message.message, settings.extractTags, false)
          : removeTaggedBlocks(message.message, settings.excludeTags);
      return content ? `[楼层 ${message.message_id} · ${message.role} / ${message.name}]\n${content}` : '';
    })
    .filter(Boolean);
  return blocks.join('\n\n');
}

async function generateIncrementalProfile(settings: ManagerSettings, profile: CachedProfile): Promise<string> {
  const newHistory = collectHistoryAfterFloor(settings, profile.updatedAtFloor);
  if (!newHistory) throw Error('到达更新楼层，但提取规则没有从新增剧情中得到可用正文。');
  const result = await generate({
    ...generationOptions(settings),
    should_stream: false,
    should_silence: true,
    max_chat_history: 0,
    user_input: `你正在维护一份会随剧情发展的角色记忆。更新任务已经由外部脚本按用户设置的楼层规则确定，你无须判断是否应该更新。\n\n要求：\n1. 根据新增剧情更新档案，只吸收已经发生或明确确认的事实。\n2. 保留仍然有效的旧资料，修正已变化的信息。\n3. 不要输出差异补丁，输出可直接替换使用的完整最新版档案。\n4. 只输出 <character_profile>...</character_profile>。\n\n<previous_profile>\n${profile.content}\n</previous_profile>\n\n<new_history>\n${newHistory}\n</new_history>`,
  });
  if (typeof result !== 'string') throw Error('自动更新返回了工具调用，未返回人物档案文本。');
  const content = extractTaggedText(result, 'character_profile,人物档案', false);
  if (!content) throw Error('自动更新结果缺少 <character_profile> 或 <人物档案> 标签。');
  return content;
}

const updatingChats = new Set<string>();

async function performProfileUpdate(
  settings: ManagerSettings,
  profile: CachedProfile,
  runtime: ManagerRuntime,
  currentFloor: number,
): Promise<void> {
  const content = await generateIncrementalProfile(settings, profile);
  await commitProfileRevision(profile, content, currentFloor, runtime);
  console.info(`[世界书角色平台] ${profile.name} 已更新至 v${profile.revisions.at(-1)?.version}（${currentFloor} 楼）`);
}

export async function updateCurrentProfileNow(settings: ManagerSettings, runtime: ManagerRuntime): Promise<void> {
  const chatId = SillyTavern.getCurrentChatId();
  const profile = settings.profiles[chatId];
  if (!profile) throw Error('当前聊天还没有由本脚本维护的角色档案。');
  if (updatingChats.has(chatId)) throw Error('该角色档案正在更新，请稍候。');
  const currentFloor = Math.max(0, getLastMessageId());
  updatingChats.add(chatId);
  try {
    await deleteExpiredRevisions(profile, currentFloor);
    await performProfileUpdate(settings, profile, runtime, currentFloor);
  } finally {
    updatingChats.delete(chatId);
  }
}

export async function maintainCurrentProfile(
  settings: ManagerSettings,
  runtime: ManagerRuntime,
  allowAutomaticUpdate = true,
): Promise<void> {
  const chatId = SillyTavern.getCurrentChatId();
  const profile = settings.profiles[chatId];
  if (!profile || updatingChats.has(chatId)) return;
  const currentFloor = Math.max(0, getLastMessageId());
  await deleteExpiredRevisions(profile, currentFloor);
  if (!allowAutomaticUpdate || !profile.enabled || !profile.autoUpdate || currentFloor < profile.nextUpdateFloor)
    return;

  updatingChats.add(chatId);
  try {
    const elapsed = Math.max(0, currentFloor - profile.updatedAtFloor);
    if (profile.updateMode === 'aware') {
      const $prompt = $('<div>').text(
        `角色记忆“${profile.name}”自 ${profile.updatedAtFloor} 楼更新后已经过去 ${elapsed} 楼。现在更新吗？`,
      );
      const result = await SillyTavern.callGenericPopup($prompt, SillyTavern.POPUP_TYPE.CONFIRM);
      if (result !== true && result !== SillyTavern.POPUP_RESULT.AFFIRMATIVE) {
        profile.nextUpdateFloor = currentFloor + profile.updateInterval;
        return;
      }
    }

    await performProfileUpdate(settings, profile, runtime, currentFloor);
  } finally {
    updatingChats.delete(chatId);
  }
}

export async function createBasicEntry(worldbookName: string, name = '新条目'): Promise<WorldbookEntry> {
  const { new_entries } = await createWorldbookEntries(
    worldbookName,
    [
      {
        name,
        enabled: true,
        strategy: { type: 'constant' },
        position: { type: 'at_depth', role: 'system', depth: 4, order: 100 },
        content: '',
      },
    ],
    { render: 'immediate' },
  );
  return new_entries[0];
}
