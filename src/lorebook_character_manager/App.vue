<!-- eslint-disable better-tailwindcss/no-unknown-classes, better-tailwindcss/enforce-consistent-class-order -->
<template>
  <button v-if="!open" class="launcher" title="世界书角色平台" @click="setOpen(true)">书</button>

  <main v-else class="panel">
    <header class="topbar">
      <div>
        <div class="eyebrow">LOREBOOK STUDIO</div>
        <h1>世界书角色平台</h1>
      </div>
      <button class="icon-button" title="收起" @click="setOpen(false)">×</button>
    </header>

    <nav class="tabs">
      <button v-for="item in tabs" :key="item.id" :class="{ active: tab === item.id }" @click="tab = item.id">
        {{ item.label }}
      </button>
    </nav>

    <section v-if="tab === 'create'" class="content">
      <div class="notice">
        <span class="status-dot"></span>
        临时档案绑定当前聊天；切换聊天会自动卸载，返回时自动恢复。
      </div>

      <div v-if="currentProfile" class="memory-card">
        <div class="section-title compact">
          <div>
            <h2>记忆与缓存 · {{ currentProfile.name }}</h2>
            <p>
              更新于 {{ currentProfile.updatedAtFloor }} 楼 · 当前 v{{ currentProfile.revisions.at(-1)?.version ?? 1 }}
            </p>
          </div>
          <label class="switch" title="自动更新角色记忆">
            <input v-model="currentProfile.autoUpdate" type="checkbox" />
            <span></span>
          </label>
        </div>
        <button class="secondary memory-update" :disabled="busy" @click="manualUpdateProfile">立即更新档案</button>
        <template v-if="currentProfile.autoUpdate">
          <label class="field">
            <span>每隔多少楼自动判定更新</span>
            <input
              v-model.number="currentProfile.updateInterval"
              type="number"
              min="1"
              max="1000"
              @change="rescheduleProfile"
            />
          </label>
          <div class="segmented">
            <button
              :class="{ active: currentProfile.updateMode === 'silent' }"
              @click="currentProfile.updateMode = 'silent'"
            >
              完全静默
            </button>
            <button
              :class="{ active: currentProfile.updateMode === 'aware' }"
              @click="currentProfile.updateMode = 'aware'"
            >
              感知模式
            </button>
          </div>
          <p class="hint">
            下次检查：{{ currentProfile.nextUpdateFloor }} 楼。更新时新增版本并关闭旧条目，旧版本在 10 楼后永久删除。
          </p>
        </template>
        <div v-if="currentProfile.revisions.length > 1" class="revision-list">
          <span v-for="revision in currentProfile.revisions" :key="revision.version">
            v{{ revision.version }} · {{ revision.createdAtFloor }}楼
            <small v-if="revision.deleteAfterFloor">（{{ revision.deleteAfterFloor }}楼删除）</small>
          </span>
        </div>
      </div>

      <label class="field">
        <span>角色名称</span>
        <input v-model="profileName" placeholder="例如：雾岛遥" />
      </label>
      <label class="field">
        <span>本次创作要求</span>
        <textarea
          v-model="requirements"
          rows="4"
          placeholder="身份、气质、与当前剧情的关系、希望保留的矛盾……"
        ></textarea>
      </label>

      <div class="grid two">
        <label class="field">
          <span>读取最近楼层</span>
          <input v-model.number="settings.historyCount" type="number" min="0" max="1000" @change="scanHistoryTags" />
        </label>
        <label class="checkbox-field">
          <input v-model="settings.includeSystemHistory" type="checkbox" @change="scanHistoryTags" />
          <span>包含 system 楼层</span>
        </label>
      </div>

      <div class="extraction-box">
        <div class="section-title compact">
          <h2>XML 正文提取</h2>
          <button class="text-button" @click="scanHistoryTags">重新扫描</button>
        </div>
        <div class="segmented">
          <button
            :class="{ active: settings.extractionMode === 'whitelist' }"
            @click="settings.extractionMode = 'whitelist'"
          >
            白名单：只保留所选标签
          </button>
          <button
            :class="{ active: settings.extractionMode === 'blacklist' }"
            @click="settings.extractionMode = 'blacklist'"
          >
            黑名单：排除所选标签
          </button>
        </div>
        <p class="hint extraction-hint">
          {{
            settings.extractionMode === 'whitelist'
              ? '适合正文始终由 content / novel 等标签包裹的预设。'
              : '适合正文没有固定标签、只需去掉 think / update 等辅助区块的预设。'
          }}
        </p>
        <div v-if="detectedTags.length" class="tag-list">
          <button
            v-for="tag in detectedTags"
            :key="tag.name"
            :class="['tag-chip', { selected: isTagSelected(tag.name) }]"
            @click="toggleDetectedTag(tag.name)"
          >
            &lt;{{ tag.name }}&gt; <small>{{ tag.count }}</small>
          </button>
        </div>
        <div v-else class="empty-tags">最近 {{ settings.historyCount }} 个可见对话楼层中未发现成对 XML 标签。</div>
        <label class="field tag-input">
          <span>{{ settings.extractionMode === 'whitelist' ? '保留标签' : '排除标签' }}</span>
          <input v-model="selectedTagText" placeholder="用逗号分隔；也可点击上方自动发现的标签" />
        </label>
      </div>

      <button class="primary" :disabled="busy" @click="roll(false)">
        {{ busy ? '正在生成…' : '生成人物档案' }}
      </button>

      <template v-if="draft">
        <div class="section-title">
          <h2>档案草稿</h2>
          <span>{{ draft.length }} 字符</span>
        </div>
        <textarea v-model="draft" class="draft" rows="13"></textarea>

        <label class="field">
          <span>修改意见（用于重 ROLL）</span>
          <input v-model="feedback" placeholder="例如：降低超自然能力，强化与主角的利益冲突" />
        </label>
        <div class="grid two">
          <button class="secondary" :disabled="busy" @click="roll(true)">按意见重 ROLL</button>
          <button class="primary" :disabled="busy || !draft.trim()" @click="injectDraft">注入临时世界书</button>
        </div>
      </template>
    </section>

    <section v-else-if="tab === 'books'" class="content">
      <div class="toolbar">
        <select v-model="selectedBook" @change="loadEntries">
          <option value="">选择世界书</option>
          <option v-for="name in bookNames" :key="name" :value="name">{{ name }}</option>
        </select>
        <button class="small-button" @click="refreshBooks">刷新</button>
      </div>
      <div class="toolbar">
        <input v-model="newBookName" placeholder="新世界书名称" @keyup.enter="createBook" />
        <button class="small-button dark" :disabled="!newBookName.trim()" @click="createBook">创建</button>
      </div>

      <div v-if="selectedBook" class="section-title">
        <h2>{{ selectedBook }}</h2>
        <button class="text-button" @click="addEntry">＋ 新建条目</button>
      </div>
      <div v-if="selectedBook && !entries.length" class="empty">这个世界书还没有条目。</div>
      <div class="entry-list">
        <article
          v-for="entry in entries"
          :key="entry.uid"
          :class="['entry-card', { selected: editing?.uid === entry.uid }]"
        >
          <button class="entry-main" @click="editEntry(entry)">
            <span class="entry-name">{{ entry.name || '未命名条目' }}</span>
            <span class="entry-meta">深度 {{ entry.position.depth }} · {{ roleLabel(entry.position.role) }}</span>
          </button>
          <label class="switch" :title="entry.enabled ? '关闭条目' : '打开条目'">
            <input :checked="entry.enabled" type="checkbox" @change="toggleEntry(entry)" />
            <span></span>
          </label>
        </article>
      </div>

      <div v-if="editing" class="editor">
        <div class="section-title">
          <h2>编辑条目</h2>
          <button class="text-button danger" @click="removeEntry">删除</button>
        </div>
        <label class="field"><span>名称</span><input v-model="editing.name" /></label>
        <div class="grid two">
          <label class="field"
            ><span>注入深度</span><input v-model.number="editing.position.depth" type="number" min="0"
          /></label>
          <label class="field">
            <span>消息身份</span>
            <select v-model="editing.position.role">
              <option value="system">系统</option>
              <option value="assistant">AI</option>
              <option value="user">用户</option>
            </select>
          </label>
        </div>
        <label class="field"><span>内容</span><textarea v-model="editing.content" rows="12"></textarea></label>
        <button class="primary" :disabled="busy" @click="saveEntry">保存条目</button>
      </div>
    </section>

    <section v-else class="content">
      <div class="setting-group">
        <h2>生成 API</h2>
        <div class="segmented">
          <button :class="{ active: settings.apiMode === 'follow' }" @click="settings.apiMode = 'follow'">
            跟随主 API
          </button>
          <button :class="{ active: settings.apiMode === 'independent' }" @click="settings.apiMode = 'independent'">
            独立 API
          </button>
        </div>
        <template v-if="settings.apiMode === 'independent'">
          <div class="segmented subtle">
            <button :class="{ active: settings.apiKind === 'custom' }" @click="settings.apiKind = 'custom'">
              自定义连接
            </button>
            <button :class="{ active: settings.apiKind === 'proxy' }" @click="settings.apiKind = 'proxy'">
              代理预设
            </button>
          </div>
          <template v-if="settings.apiKind === 'custom'">
            <label class="field"
              ><span>API 地址</span><input v-model="settings.apiUrl" placeholder="https://api.example.com/v1"
            /></label>
            <label class="field"
              ><span>API Key</span
              ><input v-model="settings.apiKey" type="password" autocomplete="off" placeholder="仅保存在脚本变量中"
            /></label>
            <div class="grid two">
              <label class="field"
                ><span>API 类型</span><input v-model="settings.apiSource" placeholder="openai"
              /></label>
              <label class="field"><span>模型</span><input v-model="settings.apiModel" placeholder="模型名称" /></label>
            </div>
          </template>
          <template v-else>
            <label class="field">
              <span>代理预设</span>
              <select v-model="settings.proxyPreset">
                <option value="">请选择</option>
                <option v-for="name in proxyPresets" :key="name" :value="name">{{ name }}</option>
              </select>
            </label>
            <label class="field"
              ><span>模型（可选覆盖）</span><input v-model="settings.apiModel" placeholder="留空使用代理预设设置"
            /></label>
          </template>
        </template>
      </div>

      <div class="setting-group">
        <h2>生成预设</h2>
        <div class="segmented">
          <button :class="{ active: settings.presetMode === 'follow' }" @click="settings.presetMode = 'follow'">
            跟随主预设
          </button>
          <button
            :class="{ active: settings.presetMode === 'independent' }"
            @click="settings.presetMode = 'independent'"
          >
            独立预设
          </button>
        </div>
        <label v-if="settings.presetMode === 'independent'" class="field">
          <span>选择预设</span>
          <select v-model="settings.presetName">
            <option value="">请选择</option>
            <option v-for="name in presets" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
      </div>

      <div class="setting-group">
        <h2>临时条目注入</h2>
        <div class="grid two">
          <label class="field"
            ><span>深度</span><input v-model.number="settings.injectionDepth" type="number" min="0" max="999"
          /></label>
          <label class="field"
            ><span>身份</span
            ><select v-model="settings.injectionRole">
              <option value="system">系统</option>
              <option value="assistant">AI</option>
              <option value="user">用户</option>
            </select></label
          >
        </div>
      </div>

      <div class="setting-group">
        <h2>人物创建模板</h2>
        <div class="segmented">
          <button :class="{ active: settings.templateMode === 'builtin' }" @click="settings.templateMode = 'builtin'">
            内置 / 自定义
          </button>
          <button
            :class="{ active: settings.templateMode === 'worldbook' }"
            @click="settings.templateMode = 'worldbook'"
          >
            世界书条目
          </button>
        </div>
        <template v-if="settings.templateMode === 'worldbook'">
          <label class="field">
            <span>模板所在世界书</span>
            <select v-model="settings.templateWorldbook" @change="loadTemplateEntries(true)">
              <option value="">请选择</option>
              <option v-for="name in bookNames" :key="name" :value="name">{{ name }}</option>
            </select>
          </label>
          <label class="field">
            <span>模板条目</span>
            <select v-model="settings.templateEntryUid">
              <option :value="null">请选择</option>
              <option v-for="entry in templateEntries" :key="entry.uid" :value="entry.uid">
                {{ entry.name || `条目 ${entry.uid}` }}
              </option>
            </select>
          </label>
        </template>
        <textarea v-else v-model="settings.template" rows="12"></textarea>
        <p class="hint">生成时会自动附上正文提取后的聊天记录与用户要求。</p>
      </div>
    </section>

    <footer v-if="message" :class="['toast', messageType]">{{ message }}</footer>
  </main>
</template>

<script setup lang="ts">
import { klona } from 'klona';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  createBasicEntry,
  detectHistoryXmlTags,
  generateProfile,
  saveTemporaryProfile,
  updateCurrentProfileNow,
  type DetectedXmlTag,
} from './services';
import { useManagerStore } from './store';
import type { ManagerRuntime } from './types';

const props = defineProps<{ runtime: ManagerRuntime; onPanelState: (open: boolean) => void }>();
const { settings } = storeToRefs(useManagerStore());
const tabs = [
  { id: 'create', label: '角色创作' },
  { id: 'books', label: '世界书' },
  { id: 'settings', label: '设置' },
] as const;
const open = ref(false);
const tab = ref<(typeof tabs)[number]['id']>('create');
const busy = ref(false);
const message = ref('');
const messageType = ref<'ok' | 'error'>('ok');
const profileName = ref('');
const requirements = ref('');
const feedback = ref('');
const draft = ref('');
const bookNames = ref<string[]>([]);
const selectedBook = ref('');
const newBookName = ref('');
const entries = ref<WorldbookEntry[]>([]);
const templateEntries = ref<WorldbookEntry[]>([]);
const editing = ref<WorldbookEntry | null>(null);
const presets = ref<string[]>([]);
const proxyPresets = ref<string[]>([]);
const detectedTags = ref<DetectedXmlTag[]>([]);
let toastTimer: number | undefined;
let offChat: EventOnReturn | undefined;

const currentProfile = computed(() => settings.value.profiles[SillyTavern.getCurrentChatId()]);
const selectedTagText = computed({
  get: () => (settings.value.extractionMode === 'whitelist' ? settings.value.extractTags : settings.value.excludeTags),
  set: value => {
    if (settings.value.extractionMode === 'whitelist') settings.value.extractTags = value;
    else settings.value.excludeTags = value;
  },
});

function selectedTags(): string[] {
  return selectedTagText.value
    .split(/[,，\s]+/)
    .map(tag => tag.trim())
    .filter(Boolean);
}

function isTagSelected(tag: string): boolean {
  return selectedTags().some(selected => selected.toLocaleLowerCase() === tag.toLocaleLowerCase());
}

function toggleDetectedTag(tag: string) {
  const tags = selectedTags();
  const index = tags.findIndex(selected => selected.toLocaleLowerCase() === tag.toLocaleLowerCase());
  if (index >= 0) tags.splice(index, 1);
  else tags.push(tag);
  selectedTagText.value = tags.join(',');
}

function scanHistoryTags() {
  detectedTags.value = detectHistoryXmlTags(settings.value.historyCount, settings.value.includeSystemHistory);
}

function rescheduleProfile() {
  if (!currentProfile.value) return;
  currentProfile.value.updateInterval = Math.max(1, Math.min(1000, Number(currentProfile.value.updateInterval) || 20));
  currentProfile.value.nextUpdateFloor = currentProfile.value.updatedAtFloor + currentProfile.value.updateInterval;
}

async function manualUpdateProfile() {
  await action(async () => updateCurrentProfileNow(settings.value, props.runtime), '角色档案已更新');
}

function notify(text: string, type: 'ok' | 'error' = 'ok') {
  message.value = text;
  messageType.value = type;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (message.value = ''), 3600);
}

async function action(work: () => Promise<void>, success?: string) {
  if (busy.value) return;
  busy.value = true;
  try {
    await work();
    if (success) notify(success);
  } catch (error) {
    console.error('[世界书角色平台]', error);
    notify(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    busy.value = false;
  }
}

function setOpen(value: boolean) {
  open.value = value;
  props.onPanelState(value);
}

async function roll(isReroll: boolean) {
  await action(
    async () => {
      draft.value = await generateProfile(
        settings.value,
        requirements.value,
        isReroll ? feedback.value : '',
        isReroll ? draft.value : '',
      );
    },
    isReroll ? '已生成新版本' : '人物档案生成完成',
  );
}

async function injectDraft() {
  await action(async () => {
    await saveTemporaryProfile(
      settings.value,
      profileName.value,
      draft.value,
      settings.value.injectionDepth,
      settings.value.injectionRole,
      props.runtime,
    );
  }, '已注入当前聊天的临时世界书');
}

async function refreshBooks() {
  bookNames.value = getWorldbookNames().sort((a, b) => a.localeCompare(b, 'zh-CN'));
  presets.value = getPresetNames();
  proxyPresets.value = getProxyPresetNames();
  if (selectedBook.value && !bookNames.value.includes(selectedBook.value)) selectedBook.value = '';
  await loadEntries();
  await loadTemplateEntries();
}

async function loadTemplateEntries(resetSelection = false) {
  if (resetSelection) settings.value.templateEntryUid = null;
  templateEntries.value = settings.value.templateWorldbook ? await getWorldbook(settings.value.templateWorldbook) : [];
}

async function loadEntries() {
  editing.value = null;
  entries.value = selectedBook.value ? await getWorldbook(selectedBook.value) : [];
}

async function createBook() {
  const name = newBookName.value.trim();
  if (!name) return;
  await action(async () => {
    await createWorldbook(name);
    newBookName.value = '';
    selectedBook.value = name;
    await refreshBooks();
  }, '世界书已创建');
}

async function addEntry() {
  if (!selectedBook.value) return;
  await action(async () => {
    const entry = await createBasicEntry(selectedBook.value);
    await loadEntries();
    editEntry(entry);
  }, '条目已创建');
}

function editEntry(entry: WorldbookEntry) {
  editing.value = klona(entry);
}

async function toggleEntry(entry: WorldbookEntry) {
  await action(
    async () => {
      await updateWorldbookWith(
        selectedBook.value,
        list => list.map(item => (item.uid === entry.uid ? { ...item, enabled: !entry.enabled } : item)),
        { render: 'immediate' },
      );
      await loadEntries();
    },
    entry.enabled ? '条目已关闭' : '条目已打开',
  );
}

async function saveEntry() {
  if (!editing.value) return;
  const changed = klona(editing.value);
  changed.position.type = 'at_depth';
  await action(async () => {
    await updateWorldbookWith(
      selectedBook.value,
      list => list.map(item => (item.uid === changed.uid ? changed : item)),
      { render: 'immediate' },
    );
    await loadEntries();
  }, '条目已保存');
}

async function removeEntry() {
  if (!editing.value) return;
  const uid = editing.value.uid;
  await action(async () => {
    await deleteWorldbookEntries(selectedBook.value, entry => entry.uid === uid, { render: 'immediate' });
    await loadEntries();
  }, '条目已删除');
}

function roleLabel(role: string) {
  return ({ system: '系统', assistant: 'AI', user: '用户' } as Record<string, string>)[role] || role;
}

function handleExternalOpen() {
  setOpen(true);
}

onMounted(async () => {
  window.addEventListener('lcm-open', handleExternalOpen);
  const cached = currentProfile.value;
  if (cached) {
    profileName.value = cached.name;
    draft.value = cached.content;
  }
  offChat = eventOn(tavern_events.CHAT_CHANGED, () => {
    const profile = settings.value.profiles[SillyTavern.getCurrentChatId()];
    profileName.value = profile?.name ?? '';
    draft.value = profile?.content ?? '';
    requirements.value = '';
    feedback.value = '';
    scanHistoryTags();
  });
  await action(refreshBooks);
  scanHistoryTags();
});

watch(
  () => currentProfile.value?.content,
  content => {
    if (content && !busy.value) draft.value = content;
  },
);

onBeforeUnmount(() => {
  window.removeEventListener('lcm-open', handleExternalOpen);
  offChat?.stop();
  window.clearTimeout(toastTimer);
});
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}
:global(html),
:global(body) {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
  color: #181818;
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
button,
input,
textarea,
select {
  font: inherit;
}
button {
  cursor: pointer;
}
.launcher {
  position: absolute;
  inset: 0;
  width: 56px;
  height: 56px;
  border: 1px solid #e7e7e7;
  border-radius: 18px;
  background: #fff;
  color: #111;
  font-weight: 800;
  font-size: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
}
.panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 13px;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 0.16em;
  color: #929292;
  font-weight: 700;
}
h1 {
  margin: 4px 0 0;
  font-size: 21px;
  letter-spacing: -0.03em;
}
h2 {
  margin: 0;
  font-size: 15px;
}
.icon-button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: #f5f5f5;
  font-size: 24px;
  line-height: 1;
  color: #555;
}
.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 0 20px;
  border-bottom: 1px solid #ededed;
}
.tabs button {
  padding: 11px 4px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #888;
  font-weight: 650;
}
.tabs button.active {
  color: #111;
  border-color: #111;
}
.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 20px 26px;
}
.notice {
  padding: 11px 12px;
  margin-bottom: 16px;
  background: #f7f7f7;
  border-radius: 11px;
  font-size: 12px;
  line-height: 1.5;
  color: #666;
}
.memory-card {
  padding: 13px;
  margin-bottom: 16px;
  border: 1px solid #dedede;
  border-radius: 13px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(0, 0, 0, 0.04);
}
.memory-card .section-title > div {
  min-width: 0;
}
.memory-card .section-title p {
  margin: 4px 0 0;
  color: #999;
  font-size: 11px;
}
.memory-card .switch {
  flex: 0 0 36px;
  margin-right: 0;
}
.memory-update {
  padding: 8px 11px;
  margin: 2px 0 12px;
  font-size: 12px;
}
.revision-list {
  display: grid;
  gap: 5px;
  padding-top: 11px;
  margin-top: 11px;
  border-top: 1px solid #eee;
  color: #777;
  font-size: 11px;
}
.revision-list small {
  color: #aaa;
}
.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  background: #2fb168;
}
.field {
  display: grid;
  gap: 7px;
  margin-bottom: 14px;
}
.field > span {
  font-size: 12px;
  color: #666;
  font-weight: 650;
}
.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 62px;
  color: #666;
  font-size: 12px;
  font-weight: 650;
}
.checkbox-field input {
  width: 16px;
  height: 16px;
  margin: 0;
}
input,
textarea,
select {
  width: 100%;
  border: 1px solid #dedede;
  border-radius: 10px;
  background: #fff;
  color: #181818;
  outline: none;
  padding: 10px 11px;
  transition:
    border 0.15s,
    box-shadow 0.15s;
}
textarea {
  resize: vertical;
  line-height: 1.55;
}
input:focus,
textarea:focus,
select:focus {
  border-color: #999;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
}
.grid {
  display: grid;
  gap: 10px;
}
.grid.two {
  grid-template-columns: 1fr 1fr;
}
.primary,
.secondary {
  width: 100%;
  border: 1px solid #111;
  border-radius: 11px;
  padding: 11px 14px;
  font-weight: 700;
}
.primary {
  background: #111;
  color: #fff;
}
.secondary {
  background: #fff;
  color: #111;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 10px;
}
.section-title > span {
  font-size: 11px;
  color: #aaa;
}
.section-title.compact {
  margin: 0 0 10px;
}
.extraction-box {
  padding: 13px;
  margin: 0 0 16px;
  border: 1px solid #e7e7e7;
  border-radius: 13px;
  background: #fafafa;
}
.extraction-hint {
  margin: -5px 1px 10px;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.tag-chip {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  color: #666;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px;
}
.tag-chip small {
  color: #aaa;
}
.tag-chip.selected {
  border-color: #111;
  background: #111;
  color: #fff;
}
.tag-chip.selected small {
  color: #bbb;
}
.empty-tags {
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: #f2f2f2;
  color: #999;
  font-size: 11px;
  line-height: 1.5;
}
.tag-input {
  margin-bottom: 0;
}
.draft {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
}
.toolbar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 10px;
}
.small-button {
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 0 13px;
  background: #fff;
  font-weight: 650;
}
.small-button.dark {
  background: #111;
  border-color: #111;
  color: #fff;
}
.text-button {
  border: 0;
  background: transparent;
  color: #333;
  font-size: 12px;
  font-weight: 700;
}
.text-button.danger {
  color: #b23434;
}
.empty {
  padding: 30px 10px;
  text-align: center;
  color: #aaa;
  font-size: 13px;
}
.entry-list {
  display: grid;
  gap: 8px;
}
.entry-card {
  display: flex;
  align-items: center;
  border: 1px solid #e6e6e6;
  border-radius: 12px;
  background: #fff;
}
.entry-card.selected {
  border-color: #999;
}
.entry-main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 3px;
  padding: 11px 12px;
  border: 0;
  background: transparent;
  text-align: left;
}
.entry-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 680;
}
.entry-meta {
  color: #999;
  font-size: 11px;
}
.switch {
  position: relative;
  width: 36px;
  height: 22px;
  margin-right: 11px;
}
.switch input {
  opacity: 0;
  position: absolute;
}
.switch span {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #d7d7d7;
  transition: 0.18s;
}
.switch span::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  transition: 0.18s;
}
.switch input:checked + span {
  background: #151515;
}
.switch input:checked + span::after {
  transform: translateX(14px);
}
.editor {
  margin-top: 18px;
  padding-top: 2px;
  border-top: 1px solid #eee;
}
.setting-group {
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
}
.setting-group:last-child {
  border-bottom: 0;
}
.setting-group h2 {
  margin-bottom: 12px;
}
.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  margin-bottom: 14px;
  border-radius: 11px;
  background: #f1f1f1;
}
.segmented button {
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #777;
  font-size: 12px;
  font-weight: 650;
}
.segmented button.active {
  background: #fff;
  color: #111;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.08);
}
.segmented.subtle {
  margin-top: -5px;
}
.hint {
  margin: -5px 0 0;
  color: #999;
  font-size: 11px;
  line-height: 1.5;
}
.toast {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 16px;
  padding: 11px 13px;
  border-radius: 11px;
  color: #fff;
  font-size: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.toast.ok {
  background: #181818;
}
.toast.error {
  background: #b93636;
}
@media (max-width: 390px) {
  .grid.two {
    grid-template-columns: 1fr;
  }
  .topbar {
    padding-top: 16px;
  }
}
</style>
