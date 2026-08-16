/**
 * 通用开场白模板的类型定义。
 *
 * 设计目标:
 * - 步骤数组完全声明式;新增/删除步骤不动组件代码,只改 `config.ts`
 * - 字段类型覆盖常见表单需求:文本、长文本、数字、单选、多选
 * - 自由扩展:StepDef/FieldDef 上的非破坏字段(如 hint、full、badge)按需使用
 */

export type FieldKind = 'text' | 'textarea' | 'number' | 'radio' | 'checkbox';

export interface FieldOption {
  id: string;
  label: string;
  description?: string;
  effects?: string[];
  icon?: string;
  badge?: string;
}

export interface FieldDef {
  /** 在 draft 中的存储键 */
  key: string;
  /** 显示名 */
  label: string;
  kind: FieldKind;
  placeholder?: string;
  defaultValue: string | number | string[];
  options?: FieldOption[];
  /** checkbox 最多可选数 */
  maxSelect?: number;
  /** number 最小值 */
  min?: number;
  /** number 最大值 */
  max?: number;
  /** text/textarea 最大字数 */
  maxLength?: number;
  /** text/textarea 最小字数(校验用) */
  minLength?: number;
  /** 是否独占一整行 */
  full?: boolean;
  /** 是否必填(默认 true) */
  required?: boolean;
  /** 字段下方的小提示 */
  hint?: string;
}

export interface StepDef {
  /** 步骤唯一 id,也用于步骤导航 */
  id: string;
  /** 步骤导航中显示的简短标签 */
  navLabel: string;
  /** 步骤内主标题 */
  title: string;
  /** 引言 */
  desc?: string;
  /** 布局:表单 / 卡片选择 */
  layout?: 'grid' | 'cards';
  /** 字段列表 */
  fields: FieldDef[];
  /** 当前步字段分组标题(可选),key 为分组标识 */
  sections?: Array<{ id: string; title?: string; fieldKeys: string[] }>;
}

export type FieldValue = string | number | string[] | null;
export type Draft = Record<string, FieldValue>;

export interface OpeningCommitResult {
  message: string;
  warnings?: string[];
}

export interface OpeningIntegration {
  name: string;
  commit: (draft: Draft) => Promise<OpeningCommitResult>;
}

export type WorldbookSyncResult = {
  applied: boolean;
  worldbookName: string | null;
  enabledEntries: string[];
  disabledEntries: string[];
  warnings: string[];
};

export type WorldbookSyncOperation = {
  result: WorldbookSyncResult;
  rollback: () => Promise<void>;
};