/**
 * 浏览器本地持久化,分两层:
 *
 * - `last-draft` 自动缓存:任意字段变化即写回,完成时也写,新对话进入自动恢复。
 *   与"永久方案"独立:用户没有显式保存,只是悄悄续填上次输入。
 * - `plans` 永久方案:用户点击"保存"按钮、命名后才会写入,可列表化管理。
 *
 * 所有 localStorage 读写包裹 try-catch,隐身模式或被禁用时仅 console.warn。
 */
const NAMESPACE = 'tavern-opening';
const LAST_DRAFT_KEY = `${NAMESPACE}:last-draft`;
const PLANS_KEY = `${NAMESPACE}:plans`;

export type FieldValue = string | number | string[] | null;
export type DraftPayload = Record<string, FieldValue>;

export interface SavedPlan {
  id: string;
  name: string;
  savedAt: string;
  data: DraftPayload;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('[自选开场白] localStorage 读取失败', { key, error });
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[自选开场白] localStorage 写入失败', { key, error });
  }
}

/* ---------- 自动缓存 (last-draft) ---------- */

export function loadLastDraft(): DraftPayload | null {
  return readJSON<DraftPayload | null>(LAST_DRAFT_KEY, null);
}

export function saveLastDraft(data: DraftPayload): void {
  writeJSON(LAST_DRAFT_KEY, data);
}

/* ---------- 永久方案 (plans) ---------- */

export function listPlans(): SavedPlan[] {
  return readJSON<SavedPlan[]>(PLANS_KEY, []);
}

export function savePlan(name: string, data: DraftPayload): SavedPlan {
  const plans = listPlans();
  const plan: SavedPlan = {
    id: `${Date.now()}-${Math.round(Math.random() * 1e6).toString(36)}`,
    name: name.trim() || '未命名方案',
    savedAt: new Date().toISOString(),
    data,
  };
  plans.unshift(plan);
  writeJSON(PLANS_KEY, plans);
  return plan;
}

export function deletePlan(id: string): void {
  writeJSON(PLANS_KEY, listPlans().filter(plan => plan.id !== id));
}