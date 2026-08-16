<template>
  <main class="opening-shell" @click="showPlanPanel = false">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>

    <header class="hero">
      <div class="eyebrow"><i class="fa-solid fa-compass"></i> PROLOGUE MAKER</div>
      <h1>在故事找到你之前</h1>
      <p>先留下一个名字、一点天性,以及你愿意承担的命运。</p>
    </header>

    <div class="toolbar">
      <button class="tool-btn" type="button" :class="{ on: showPlanPanel }" @click.stop="togglePlanPanel">
        <i class="fa-solid fa-bookmark"></i><span>方案</span><small v-if="store.savedPlans.length">· {{ store.savedPlans.length }}</small>
      </button>
      <Transition name="drop">
        <section v-if="showPlanPanel" class="plan-panel" @click.stop>
          <div class="plan-new">
            <input v-model="planName" maxlength="40" placeholder="给当前方案起个名字" />
            <button type="button" :disabled="!planName.trim()" @click="saveCurrentAsPlan">保存</button>
          </div>
          <p class="plan-hint">命名保存的方案会永久保留,可在任意聊天中调用。<br />另外,本聊天最后一次填写的内容会自动缓存,下次进入新对话时自动恢复。</p>
          <p v-if="store.savedPlans.length === 0" class="plan-empty">还没有保存的方案。</p>
          <ul v-else class="plan-list">
            <li v-for="plan in store.savedPlans" :key="plan.id">
              <div class="plan-info">
                <strong>{{ plan.name }}</strong>
                <small>{{ formatSavedAt(plan.savedAt) }}</small>
              </div>
              <div class="plan-actions">
                <button type="button" class="mini" @click="applyPlan(plan)">应用</button>
                <button type="button" class="mini danger" @click="removePlan(plan.id)">删除</button>
              </div>
            </li>
          </ul>
        </section>
      </Transition>
    </div>

    <nav class="steps" aria-label="创建进度">
      <button v-for="(label, i) in stepLabels" :key="i" :class="{ active: store.step === i + 1, done: store.step > i + 1 }" type="button" @click="jumpTo(i + 1)">
        <span>{{ store.step > i + 1 ? '✓' : i + 1 }}</span>
        <small>{{ label }}</small>
      </button>
    </nav>

    <section class="panel">
      <Transition name="page" mode="out-in">
        <!-- 最后一步: 确认页 -->
        <div v-if="store.step === store.finalStep" key="review" class="page-section review">
          <div class="section-title">
            <span>{{ String(store.finalStep).padStart(2, '0') }}</span>
            <div><h2>让序章落笔</h2><p>复核信息后,生成你的开局。</p></div>
          </div>
          <div class="review-card">
            <template v-for="step in stepsWithFields" :key="step.id">
              <h3 class="review-group">{{ step.navLabel }} · {{ step.title }}</h3>
              <div v-for="field in step.fields" :key="field.key" class="summary-row">
                <span>{{ field.label }}</span>
                <strong>{{ formatField(field) }}</strong>
              </div>
            </template>
          </div>
          <div v-if="openingIntegration" class="integration-bound">
            <i class="fa-solid fa-circle-check"></i>
            <div><strong>已绑定适配器: {{ openingIntegration.name }}</strong><small>完成时将自动写入 MVU 与 lorebook。</small></div>
          </div>
          <div v-else class="integration-pending">
            <i class="fa-solid fa-puzzle-piece"></i>
            <div><strong>演示模式</strong><small>未绑定正式适配器,完成时仅在控制台输出草案,不会写入 MVU 或修改世界书。</small></div>
          </div>
        </div>

        <!-- 中间步骤: 动态字段渲染 -->
        <div v-else :key="currentStep.id" class="page-section">
          <div class="section-title">
            <span>{{ String(store.step).padStart(2, '0') }}</span>
            <div><h2>{{ currentStep.title }}</h2><p v-if="currentStep.desc">{{ currentStep.desc }}</p></div>
          </div>

          <!-- 布局: 表单 -->
          <div v-if="currentStep.layout === 'grid'" class="form-grid">
            <label v-for="field in currentStep.fields" :key="field.key" :class="{ full: field.full }">
              <span>{{ field.label }}<em v-if="field.required !== false">*</em></span>
              <input
                v-if="field.kind === 'text' || field.kind === 'number'"
                :type="field.kind === 'number' ? 'number' : 'text'"
                :value="store.draft[field.key]"
                :placeholder="field.placeholder"
                :min="field.min"
                :max="field.max"
                :maxlength="field.maxLength"
                @input="onInput(field, ($event.target as HTMLInputElement).value)"
              />
              <textarea
                v-else
                :value="store.draft[field.key] as string"
                :placeholder="field.placeholder"
                :maxlength="field.maxLength"
                @input="onInput(field, ($event.target as HTMLTextAreaElement).value)"
              ></textarea>
              <small v-if="field.kind === 'textarea' && field.maxLength" class="counter">{{ String(store.draft[field.key] || '').length }}/{{ field.maxLength }}</small>
              <small v-if="field.hint" class="hint">{{ field.hint }}</small>
            </label>
          </div>

          <!-- 布局: 卡片选择 -->
          <div v-else class="choice-stacks">
            <div v-for="field in currentStep.fields" :key="field.key" class="choice-stack">
              <h3 class="group-label">{{ field.label }}<em v-if="field.maxSelect"> · 最多 {{ field.maxSelect }} 项</em></h3>
              <div class="choice-grid" :class="{ single: field.options && field.options.length <= 2 }">
                <button
                  v-for="opt in field.options"
                  :key="opt.id"
                  type="button"
                  :class="['choice-card', { selected: isOptionSelected(field, opt.id), locked: isOptionLocked(field, opt.id) }]"
                  @click="onOptionClick(field, opt.id)"
                >
                  <i v-if="opt.icon" :class="opt.icon"></i>
                  <div v-else-if="field.kind === 'radio'" class="avatar">{{ opt.label.slice(0, 1) }}</div>
                  <div class="card-body">
                    <small v-if="opt.badge">{{ opt.badge }}</small>
                    <h3>{{ opt.label }}</h3>
                    <p v-if="opt.description">{{ opt.description }}</p>
                    <ul v-if="opt.effects && opt.effects.length">
                      <li v-for="effect in opt.effects" :key="effect">{{ effect }}</li>
                    </ul>
                  </div>
                  <span :class="field.kind === 'radio' ? 'radio' : 'check'">{{ field.kind === 'checkbox' ? '✓' : '' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <div v-if="status.message" :class="['status', status.kind]">
        <i :class="statusIcon"></i>
        <div><strong>{{ status.title }}</strong><p>{{ status.message }}</p></div>
      </div>

      <footer>
        <button v-if="store.step > 1" class="ghost" type="button" :disabled="busy" @click="prevStep"><i class="fa-solid fa-arrow-left"></i> 返回</button>
        <span v-else></span>
        <button v-if="store.step < store.finalStep" class="primary" type="button" @click="nextStep">继续 <i class="fa-solid fa-arrow-right"></i></button>
        <button v-else class="primary finish" type="button" :disabled="busy" @click="finish">
          <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-feather-pointed'"></i>
          {{ busy ? '正在写入…' : '生成我的开局' }}
        </button>
      </footer>
    </section>

    <p class="runtime-note">
      <i :class="isTavernRuntime ? 'fa-solid fa-link' : 'fa-solid fa-flask'"></i>
      {{ isTavernRuntime ? '已连接酒馆与 MVU 变量框架' : '本地视觉预览:确认操作只会展示生成结果' }}
    </p>
  </main>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref } from 'vue';
import { STEPS } from './config';
import { getOpeningIntegration } from './integration';
import { useOpeningStore } from './store';
import type { FieldDef, SavedPlan } from './types';

const store = useOpeningStore();
const openingIntegration = getOpeningIntegration();
const isTavernRuntime = inject<boolean>('isTavernRuntime', false);
const busy = ref(false);
const showPlanPanel = ref(false);
const planName = ref('');
const status = reactive({ kind: 'info' as 'info' | 'success' | 'error', title: '', message: '' });
const stepLabels = computed(() => [...STEPS.map(step => step.navLabel), '确认']);
const stepsWithFields = computed(() => STEPS);
const currentStep = computed(() => STEPS[store.step - 1]);
const statusIcon = computed(() =>
  status.kind === 'success' ? 'fa-solid fa-circle-check' :
  status.kind === 'error' ? 'fa-solid fa-triangle-exclamation' :
  'fa-solid fa-circle-info',
);

function jumpTo(target: number) {
  if (target < store.step) store.step = target;
}

function prevStep() {
  store.step -= 1;
  status.message = '';
}

function nextStep() {
  const errors = store.validateStep(store.step);
  if (errors.length > 0) {
    Object.assign(status, { kind: 'error', title: '还差一点', message: errors[0] });
    return;
  }
  status.message = '';
  store.step += 1;
}

async function finish() {
  busy.value = true;
  status.message = '';
  try {
    const errors = store.validateAll();
    if (errors.length > 0) {
      Object.assign(status, { kind: 'error', title: '校验未通过', message: errors[0] });
      return;
    }
    const draft = store.buildDraft();
    if (!openingIntegration) {
      Object.assign(status, {
        kind: 'success',
        title: '草案生成成功',
        message: '当前为演示模式,未写入任何数据。',
      });
      console.info('[自选开场白] 演示草案', draft);
      return;
    }
    if (!isTavernRuntime) throw new Error('正式适配器只能在酒馆楼层中执行。');
    const result = await openingIntegration.commit(draft);
    Object.assign(status, {
      kind: 'success',
      title: '序章已经准备好了',
      message: result.warnings?.join(' ') || result.message,
    });
    console.info('[自选开场白] 适配器执行完成', { draft, result });
  } catch (error) {
    console.error('[自选开场白] 初始化失败', error);
    Object.assign(status, {
      kind: 'error',
      title: '初始化没有完成',
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    busy.value = false;
  }
}

/* ---------- 字段渲染辅助 ---------- */

function onInput(field: FieldDef, raw: string) {
  if (field.kind === 'number') {
    const num = raw === '' ? null : Number(raw);
    store.setField(field.key, num);
  } else {
    store.setField(field.key, raw);
  }
}

function onOptionClick(field: FieldDef, optionId: string) {
  if (field.kind === 'radio') {
    store.setField(field.key, optionId);
  } else if (field.kind === 'checkbox') {
    store.toggleCheckbox(field.key, optionId, field.maxSelect);
  }
}

function isOptionSelected(field: FieldDef, optionId: string): boolean {
  if (field.kind === 'radio') return store.draft[field.key] === optionId;
  if (field.kind === 'checkbox') return store.isCheckboxSelected(field.key, optionId);
  return false;
}

function isOptionLocked(field: FieldDef, optionId: string): boolean {
  if (field.kind === 'checkbox') return store.isCheckboxLocked(field.key, optionId, field.maxSelect);
  return false;
}

function formatField(field: FieldDef): string {
  const value = store.draft[field.key];
  if (value === null || value === undefined || value === '') return '未填写';
  if (field.kind === 'checkbox' && Array.isArray(value)) {
    if (value.length === 0) return '未选择';
    return field.options?.filter(opt => value.includes(opt.id)).map(opt => opt.label).join('、') || '已选择';
  }
  if (field.kind === 'radio') {
    return field.options?.find(opt => opt.id === value)?.label || String(value);
  }
  return String(value);
}

/* ---------- 方案管理 ---------- */

function togglePlanPanel() {
  planName.value = '';
  showPlanPanel.value = !showPlanPanel.value;
}

function saveCurrentAsPlan() {
  if (!planName.value.trim()) return;
  const plan = store.persistPlan(planName.value);
  if (plan) {
    planName.value = '';
    showPlanPanel.value = false;
    Object.assign(status, { kind: 'success', title: '方案已保存', message: `《${plan.name}》已永久保留,下次进入任意聊天均可一键应用。` });
  }
}

function applyPlan(plan: SavedPlan) {
  store.applyPlan(plan);
  showPlanPanel.value = false;
  Object.assign(status, { kind: 'info', title: '方案已恢复', message: `已应用《${plan.name}》。` });
  store.step = 1;
}

function removePlan(id: string) {
  store.removePlan(id);
}

function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hh}:${mm}`;
}
</script>

<style lang="scss" scoped>
:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; color: #f5efe4; font-family: Inter, "Microsoft YaHei", sans-serif; background: transparent; }
button, input, textarea { font: inherit; }
button { color: inherit; }
em { font-style: normal; color: var(--gold); margin-left: 4px; }

.opening-shell {
  --gold: #d8ae6d;
  --ink: #111519;
  --panel-bg: rgba(17,21,25,.78);
  position: relative;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(20px, 5vw, 64px);
  border: 1px solid rgba(216,174,109,.22);
  border-radius: clamp(18px, 3vw, 28px);
  background: radial-gradient(circle at 76% 8%, rgba(108,80,49,.24), transparent 31%), linear-gradient(145deg, #161b20, #0d1013 72%);
  box-shadow: 0 28px 80px rgba(0,0,0,.32);
}

.ambient { position: absolute; border-radius: 999px; filter: blur(70px); opacity: .18; pointer-events: none; }
.ambient-one { width: 270px; height: 270px; top: -120px; right: 3%; background: #e4a95d; }
.ambient-two { width: 220px; height: 220px; bottom: -100px; left: -60px; background: #486f72; }

.hero, .toolbar, .steps, .panel, .runtime-note { position: relative; }
.hero, .steps, .panel, .runtime-note { z-index: 1; }
.toolbar { z-index: 30; }

.hero { max-width: 740px; margin-bottom: clamp(18px, 4vw, 32px); }
.eyebrow { color: var(--gold); font-size: 11px; letter-spacing: .3em; font-weight: 800; }
.eyebrow i { margin-right: 9px; }
.hero h1 { margin: 12px 0 8px; font-family: Georgia, "STSong", serif; font-size: clamp(30px, 6vw, 64px); font-weight: 500; letter-spacing: -.04em; line-height: 1.06; }
.hero p { margin: 0; color: #9ea4a6; font-size: clamp(13px, 1.6vw, 14px); letter-spacing: .04em; }

/* ---------- 方案工具栏 ---------- */
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 14px; }
.tool-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px; border: 1px solid #30363a; border-radius: 99px;
  color: #b9bdba; background: rgba(17,21,25,.6); font-size: 12px; cursor: pointer; transition: .2s;
  small { color: var(--gold); font-size: 10px; }
  &:hover, &.on { border-color: var(--gold); color: var(--gold); }
}
.plan-panel {
  position: absolute; right: 0; top: calc(100% + 8px); width: min(340px, 80vw);
  padding: 14px; border: 1px solid #353c40; border-radius: 14px;
  background: var(--panel-bg); backdrop-filter: blur(18px); box-shadow: 0 18px 40px rgba(0,0,0,.32);
  z-index: 10;
}
.plan-new { display: flex; gap: 8px; margin-bottom: 10px; }
.plan-new input { flex: 1; min-width: 0; height: 38px; padding: 0 12px; }
.plan-new button {
  height: 38px; padding: 0 16px; border: 1px solid var(--gold); border-radius: 9px;
  color: #17130e; background: linear-gradient(135deg, #ead09e, #bd8d4e); font-weight: 800; cursor: pointer;
  &:disabled { opacity: .4; cursor: not-allowed; }
}
.plan-hint { margin: 0 0 10px; padding-bottom: 10px; border-bottom: 1px dashed rgba(255,255,255,.08); color: #7f878a; font-size: 10px; line-height: 1.6; }
.plan-empty { margin: 0; padding: 8px 2px; color: #7f878a; font-size: 11px; }
.plan-list { margin: 0; padding: 0; list-style: none; max-height: 240px; overflow-y: auto; }
.plan-list li { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-top: 1px solid rgba(255,255,255,.05); }
.plan-info { flex: 1; min-width: 0; }
.plan-info strong { display: block; font-size: 12px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
.plan-info small { display: block; margin-top: 3px; color: #737a7d; font-size: 10px; }
.plan-actions { display: flex; gap: 6px; flex-shrink: 0; }
.mini { padding: 5px 11px; border: 1px solid #3b4245; border-radius: 7px; color: #c5ac82; background: transparent; font-size: 10px; cursor: pointer; transition: .15s; }
.mini:hover { border-color: var(--gold); color: var(--gold); }
.mini.danger { color: #c49797; }
.mini.danger:hover { border-color: #b06868; color: #e2a1a1; }
.drop-enter-active, .drop-leave-active { transition: opacity .18s ease, transform .18s ease; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px); }

/* ---------- 步骤导航 ---------- */
.steps { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.steps button { flex: 1 1 auto; min-width: 80px; display: flex; align-items: center; gap: 9px; padding: 8px 4px; border: 0; border-bottom: 1px solid #30363a; color: #697176; background: transparent; text-align: left; cursor: default; }
.steps button.done { cursor: pointer; }
.steps button.active, .steps button.done { color: #e8d7bb; border-color: var(--gold); }
.steps span { display: grid; place-items: center; width: 24px; height: 24px; border: 1px solid currentColor; border-radius: 50%; font-size: 11px; flex-shrink: 0; }
.steps small { font-size: 12px; letter-spacing: .16em; }

/* ---------- 主面板 ---------- */
.panel { padding: clamp(18px, 4vw, 36px); border: 1px solid rgba(255,255,255,.07); border-radius: 20px; background: var(--panel-bg); backdrop-filter: blur(18px); }
.page-section { min-height: clamp(360px, 44vh, 460px); }

.section-title { display: flex; gap: 15px; align-items: flex-start; margin-bottom: 24px; }
.section-title > span { color: var(--gold); font-family: Georgia, serif; font-size: 15px; }
.section-title h2 { margin: 0 0 5px; font-family: Georgia, "STSong", serif; font-size: clamp(20px, 3vw, 26px); font-weight: 500; }
.section-title p { margin: 0; color: #858d90; font-size: 12px; }

/* ---------- 表单布局 ---------- */
.form-grid { display: grid; grid-template-columns: 1.4fr .6fr; gap: 14px 18px; }
label { display: block; }
label.full { grid-column: 1 / -1; position: relative; }
label > span { display: block; margin-bottom: 8px; color: #b9bdba; font-size: 11px; font-weight: 700; letter-spacing: .1em; }
input, textarea { width: 100%; border: 1px solid #32383b; border-radius: 10px; outline: none; color: #f7f1e8; background: #0d1114; transition: .2s ease; }
input { height: 45px; padding: 0 14px; }
textarea { height: 112px; resize: none; padding: 13px 14px; line-height: 1.7; }
input:focus, textarea:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(216,174,109,.08); }
.counter { position: absolute; right: 10px; bottom: 9px; color: #626a6d; font-size: 10px; }
.hint { display: block; margin-top: 5px; color: #7f878a; font-size: 10px; }

/* ---------- 卡片选择布局 ---------- */
.choice-stacks { display: flex; flex-direction: column; gap: 28px; }
.choice-stack .group-label { display: block; margin-bottom: 12px; color: #b9bdba; font-size: 12px; font-weight: 700; letter-spacing: .1em; }
.group-label em { color: var(--gold); font-style: normal; }
.choice-grid { display: grid; gap: 10px; grid-template-columns: repeat(3, 1fr); }
.choice-grid.single { grid-template-columns: repeat(2, 1fr); }
.choice-card {
  position: relative; display: flex; gap: 13px; align-items: flex-start;
  width: 100%; padding: 15px; padding-right: 34px;
  border: 1px solid #2d3438; border-radius: 13px; background: #11161a;
  text-align: left; cursor: pointer;
  transition: transform .2s ease, border-color .2s ease, background .2s ease;
}
.choice-card:hover:not(.locked) { transform: translateY(-2px); border-color: #7e6a4c; }
.choice-card.selected { border-color: var(--gold); background: linear-gradient(135deg, rgba(216,174,109,.12), rgba(17,22,26,.95)); }
.choice-card.locked { opacity: .42; cursor: not-allowed; }
.choice-card > i { display: grid; place-items: center; flex: 0 0 36px; height: 36px; border-radius: 10px; color: var(--gold); background: rgba(216,174,109,.1); }
.card-body { flex: 1; min-width: 0; }
.card-body small { color: var(--gold); font-size: 9px; letter-spacing: .08em; display: block; margin-bottom: 4px; }
.card-body h3 { margin: 0 0 5px; font-size: 14px; }
.card-body p { margin: 0; color: #828a8d; font-size: 11px; line-height: 1.55; }
.card-body ul { display: flex; flex-wrap: wrap; gap: 5px; margin: 9px 0 0; padding: 0; list-style: none; }
.card-body li { padding: 3px 7px; border-radius: 99px; color: #c5ac82; background: rgba(216,174,109,.09); font-size: 9px; }
.avatar { display: grid; place-items: center; flex: 0 0 36px; height: 36px; border: 1px solid #67583f; border-radius: 50%; color: var(--gold); font-family: Georgia, serif; }
.check { position: absolute; top: 10px; right: 12px; color: var(--gold); opacity: 0; font-size: 12px; }
.selected .check { opacity: 1; }
.radio { position: absolute; top: 16px; right: 15px; width: 12px; height: 12px; border: 1px solid #586064; border-radius: 50%; }
.selected .radio { border: 3px solid var(--gold); }

/* ---------- 确认页 ---------- */
.review-card { padding: 20px; border: 1px solid #32383a; border-radius: 15px; background: linear-gradient(145deg, #151b1f, #0d1114); }
.review-group { margin: 16px 0 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,.06); color: var(--gold); font-size: 13px; font-weight: 600; letter-spacing: .1em; }
.review-group:first-child { margin-top: 0; }
.summary-row { display: flex; gap: 12px; align-items: baseline; padding: 6px 0; font-size: 12px; }
.summary-row > span { width: 92px; color: #747c7f; flex-shrink: 0; }
.summary-row > strong { color: #dfc493; font-weight: 500; }
.integration-bound, .integration-pending { display: flex; gap: 12px; align-items: center; margin-top: 16px; padding: 12px 14px; border-radius: 12px; }
.integration-bound { border: 1px solid #3c5e44; background: rgba(67,126,80,.08); color: #b8d6bc; }
.integration-bound > i { color: #6db378; }
.integration-pending { border: 1px dashed #3b4245; color: #9ca3a4; }
.integration-pending > i { color: var(--gold); }
.integration-bound strong, .integration-bound small, .integration-pending strong, .integration-pending small { display: block; }
.integration-bound strong, .integration-pending strong { font-size: 11px; }
.integration-bound small, .integration-pending small { margin-top: 2px; font-size: 9px; }

/* ---------- 状态与底部 ---------- */
.status { display: flex; gap: 10px; margin-top: 14px; padding: 11px 13px; border-radius: 10px; background: rgba(91,120,116,.12); font-size: 10px; }
.status.error { color: #e9a1a1; background: rgba(154,66,66,.14); }
.status.success { color: #b8d6bc; background: rgba(67,126,80,.14); }
.status strong { font-size: 11px; }
.status p { margin: 3px 0 0; color: inherit; opacity: .82; }

footer { display: flex; justify-content: space-between; align-items: center; margin-top: 22px; gap: 12px; }
footer button { min-width: 112px; height: 41px; border-radius: 9px; cursor: pointer; transition: .2s; }
footer button:disabled { opacity: .55; cursor: wait; }
.ghost { border: 1px solid #343a3d; background: transparent; }
.primary { border: 1px solid #d9b477; color: #17130e; background: linear-gradient(135deg, #ead09e, #bd8d4e); font-weight: 800; }
.primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(186,138,74,.18); }

.runtime-note { margin: 12px 2px 0; color: #687174; font-size: 9px; letter-spacing: .08em; }
.runtime-note i { margin-right: 6px; }

.page-enter-active, .page-leave-active { transition: opacity .18s ease, transform .18s ease; }
.page-enter-from { opacity: 0; transform: translateX(10px); }
.page-leave-to { opacity: 0; transform: translateX(-8px); }

/* ---------- 响应式断点 ---------- */
@media (max-width: 1100px) {
  .form-grid { grid-template-columns: 1fr 0.7fr; }
  .choice-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .panel { padding: clamp(16px, 3vw, 28px); }
}

@media (max-width: 880px) {
  .opening-shell { padding: 22px 18px; }
  .hero { margin-bottom: 18px; }
  .steps { margin-bottom: 14px; }
  .form-grid { grid-template-columns: 1fr; gap: 14px; }
  .choice-grid { grid-template-columns: 1fr !important; }
  footer button { min-width: 96px; }
}

@media (max-width: 680px) {
  .opening-shell { padding: 18px 14px; border-radius: 18px; }
  .hero h1 { font-size: 32px; }
  .panel { padding: 18px 14px; }
  .page-section { min-height: auto; }
  .steps { gap: 6px; }
  .steps button { justify-content: center; gap: 6px; }
  .steps small { display: none; }
  footer { flex-wrap: wrap-reverse; }
  footer button { flex: 1; min-width: 0; }
  .plan-panel { width: calc(100vw - 28px); right: -4px; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
  .choice-card:hover:not(.locked) { transform: none; }
  .primary:hover:not(:disabled) { transform: none; box-shadow: none; }
}
</style>