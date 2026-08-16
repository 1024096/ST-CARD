import type { Draft } from '../types';

export type MvuDraftMerger = (current: Mvu.MvuData, draft: Draft) => Mvu.MvuData;

/**
 * MVU 通用写入辅助函数。具体变量路径完全由正式角色卡提供的 merger 决定。
 *
 * 调用方示例:
 *
 * ```ts
 * await writeOpeningToMvu(draft, (current, draft) => ({
 *   ...current,
 *   stat_data: {
 *     ...current.stat_data,
 *     玩家: { 名称: draft.name, 年龄: draft.age, 性别: draft.gender, 基础人设: draft.persona },
 *   },
 * }));
 * ```
 */
export async function writeOpeningToMvu(draft: Draft, merger: MvuDraftMerger): Promise<void> {
  const messageId = getCurrentMessageId();
  const current = Mvu.getMvuData({ type: 'message', message_id: messageId });
  const next = merger(structuredClone(current), draft);

  await Mvu.replaceMvuData(next, { type: 'message', message_id: messageId });
}