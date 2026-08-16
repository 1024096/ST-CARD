import type { Draft, FieldDef } from './types';

/**
 * 草案校验:不再写死"玩家/特质/模式"等字段,改为基于 StepsConfig 的字段元信息做最小校验。
 *
 * 校验规则:
 * - required 字段不能为空(空字符串 / null / 空数组)
 * - text/textarea 触发 minLength 校验
 * - number 触发 min/max 校验
 * - checkbox 触发 maxSelect 校验
 *
 * 校验失败返回非空字符串数组;成功返回空数组。
 * 不抛异常,让 UI 决定怎么提示。
 */
export function validateDraft(draft: Draft, fields: FieldDef[]): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    const value = draft[field.key];
    const required = field.required !== false;
    if (required && isEmpty(value)) {
      errors.push(`请填写「${field.label}」。`);
      continue;
    }
    if (isEmpty(value)) continue;
    if ((field.kind === 'text' || field.kind === 'textarea') && typeof value === 'string') {
      if (field.minLength && value.trim().length < field.minLength) {
        errors.push(`「${field.label}」至少需要 ${field.minLength} 个字。`);
      }
    }
    if (field.kind === 'number' && typeof value === 'number') {
      if (field.min !== undefined && value < field.min) errors.push(`「${field.label}」不能小于 ${field.min}。`);
      if (field.max !== undefined && value > field.max) errors.push(`「${field.label}」不能大于 ${field.max}。`);
    }
    if (field.kind === 'checkbox' && Array.isArray(value) && field.maxSelect && value.length > field.maxSelect) {
      errors.push(`「${field.label}」最多选择 ${field.maxSelect} 项。`);
    }
  }
  return errors;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export type OpeningDraft = Draft;