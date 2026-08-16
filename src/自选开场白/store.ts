import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { STEPS } from './config';
import { validateDraft } from './schema';
import {
  type DraftPayload,
  type SavedPlan,
  deletePlan,
  listPlans,
  loadLastDraft,
  saveLastDraft,
  savePlan,
} from './storage';
import type { Draft, FieldDef, FieldValue } from './types';

/** 收集所有步骤中所有字段元信息,用于校验 */
const ALL_FIELDS: FieldDef[] = STEPS.flatMap(step => step.fields);

/** 用 config 中的 defaultValue 生成空白初稿 */
function buildEmptyDraft(): Draft {
  const draft: Draft = {};
  for (const field of ALL_FIELDS) {
    draft[field.key] = cloneDefault(field.defaultValue);
  }
  return draft;
}

function cloneDefault(value: string | number | string[]): FieldValue {
  if (Array.isArray(value)) return [...value];
  return value;
}

/** 把 localStorage 的 last-draft 与默认值合并,只接受已知 key,避免脏数据污染 */
function hydrateDraft(cached: DraftPayload | null): Draft {
  const draft = buildEmptyDraft();
  if (!cached) return draft;
  for (const field of ALL_FIELDS) {
    const stored = cached[field.key];
    if (stored === undefined) continue;
    if (field.kind === 'checkbox' && Array.isArray(stored)) draft[field.key] = [...(stored as string[])];
    else if (field.kind === 'number') draft[field.key] = typeof stored === 'number' ? stored : null;
    else if (field.kind === 'radio' || field.kind === 'text' || field.kind === 'textarea') draft[field.key] = typeof stored === 'string' ? stored : '';
    else draft[field.key] = stored as FieldValue;
  }
  return draft;
}

export const useOpeningStore = defineStore('custom-opening', () => {
  const cached = loadLastDraft();
  const draft = reactive<Draft>(hydrateDraft(cached));
  const step = ref(1);
  const savedPlans = ref<SavedPlan[]>(listPlans());

  /** 总步骤数:用户声明的步骤 + 末尾自动追加的确认页 */
  const totalSteps = STEPS.length + 1;
  /** 最后一步是确认页 */
  const finalStep = STEPS.length + 1;

  function setField(key: string, value: FieldValue) {
    draft[key] = value;
  }

  function toggleCheckbox(key: string, optionId: string, maxSelect?: number) {
    const current = Array.isArray(draft[key]) ? [...(draft[key] as string[])] : [];
    const index = current.indexOf(optionId);
    if (index >= 0) {
      current.splice(index, 1);
    } else if (!maxSelect || current.length < maxSelect) {
      current.push(optionId);
    }
    draft[key] = current;
  }

  function isCheckboxSelected(key: string, optionId: string): boolean {
    return Array.isArray(draft[key]) && (draft[key] as string[]).includes(optionId);
  }

  function isCheckboxLocked(key: string, optionId: string, maxSelect?: number): boolean {
    if (!maxSelect) return false;
    const current = Array.isArray(draft[key]) ? (draft[key] as string[]) : [];
    return current.length >= maxSelect && !current.includes(optionId);
  }

  /** 校验某一个步骤的所有 required 字段 */
  function validateStep(stepIndex: number): string[] {
    const stepDef = STEPS[stepIndex - 1];
    if (!stepDef) return [];
    return validateDraft(draft, stepDef.fields);
  }

  /** 校验全部草案 */
  function validateAll(): string[] {
    return validateDraft(draft, ALL_FIELDS);
  }

  /** 导出为纯对象,供 integration.commit 使用 */
  function buildDraft(): Draft {
    return JSON.parse(JSON.stringify(draft));
  }

  /* ---------- 自动缓存 ---------- */

  function persistLast() {
    saveLastDraft(buildDraft());
  }

  watch(draft, persistLast, { deep: true });

  /* ---------- 永久方案 ---------- */

  function persistPlan(name: string): SavedPlan | null {
    if (!name.trim()) return null;
    const plan = savePlan(name, buildDraft());
    savedPlans.value = listPlans();
    return plan;
  }

  function removePlan(id: string) {
    deletePlan(id);
    savedPlans.value = listPlans();
  }

  function applyPlan(plan: SavedPlan) {
    for (const field of ALL_FIELDS) {
      const stored = plan.data[field.key];
      if (stored === undefined) continue;
      if (field.kind === 'checkbox' && Array.isArray(stored)) draft[field.key] = [...(stored as string[])];
      else if (field.kind === 'number') draft[field.key] = typeof stored === 'number' ? stored : null;
      else if (field.kind === 'radio' || field.kind === 'text' || field.kind === 'textarea') draft[field.key] = typeof stored === 'string' ? stored : '';
      else draft[field.key] = stored as FieldValue;
    }
  }

  return {
    step,
    totalSteps,
    finalStep,
    draft,
    savedPlans,
    setField,
    toggleCheckbox,
    isCheckboxSelected,
    isCheckboxLocked,
    validateStep,
    validateAll,
    buildDraft,
    persistPlan,
    removePlan,
    applyPlan,
  };
});

export type OpeningStore = ReturnType<typeof useOpeningStore>;