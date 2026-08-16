import { writeOpeningToMvu } from './services/mvu';
import { synchronizeOpeningWorldbook, type WorldbookExclusiveSelection } from './services/worldbook';
import type { Draft, OpeningCommitResult, OpeningIntegration } from './types';

/**
 * ============================================================================
 *  正式角色卡接入点(必读)
 * ============================================================================
 *
 *  本文件是模板与正式角色卡的唯一耦合点。模板在前端收集完用户输入后,
 *  会调用 `getOpeningIntegration()` 返回的适配器的 `commit(draft)` 方法,
 *  由适配器决定:
 *    1. 把 draft 映射到 MVU 变量结构的具体路径
 *    2. 打开/关闭哪些 lorebook 条目
 *    3. 是否在最后追加一条用户消息触发生成
 *
 *  当前 `getOpeningIntegration()` 返回 null,意味着演示模式:
 *    - 不写 MVU、不动 lorebook、不触发生成
 *    - 完成按钮只在 console 打印草案,在状态条提示用户
 *
 *  接入正式卡时把下面的 `null` 换成示例那样的实际适配器即可,
 *  适配器内部可以使用 services/mvu.ts 和 services/worldbook.ts 提供的辅助函数。
 *
 *  ----------------------------------------------------------------------------
 *  适配器样例(取消注释并把对应字符串改成你的实际路径):
 *  ----------------------------------------------------------------------------
 *
 *  export function getOpeningIntegration(): OpeningIntegration | null {
 *    return {
 *      name: '我的角色卡',
 *      async commit(draft) {
 *        const warnings: string[] = [];
 *
 *        // 1. 写 MVU:由 merger 决定路径,不写死在模板里
 *        await writeOpeningToMvu(draft, (current, draft) => ({
 *          ...current,
 *          stat_data: {
 *            ...current.stat_data,
 *            玩家: {
 *              名称: draft.name,
 *              年龄: draft.age,
 *              性别: draft.gender,
 *              基础人设: draft.persona,
 *            },
 *            天赋: (draft.traitIds as string[]).map(id => ({ id })),
 *          },
 *        }));
 *
 *        // 2. 互斥开关 lorebook 条目
 *        const selections: WorldbookExclusiveSelection[] = [
 *          {
 *            groupName: '难度模式',
 *            candidateEntries: ['故事模式', '标准模式', '困难模式'],
 *            selectedEntry:
 *              draft.modeId === 'easy' ? '故事模式' :
 *              draft.modeId === 'hard' ? '困难模式' : '标准模式',
 *          },
 *          {
 *            groupName: '初始伙伴',
 *            candidateEntries: ['伙伴-小智', '伙伴-小霞', '伙伴-小刚'],
 *            selectedEntry: `partner-${draft.partnerId as string}`,
 *          },
 *        ];
 *        const wb = await synchronizeOpeningWorldbook('我的世界书', selections);
 *        warnings.push(...wb.result.warnings);
 *
 *        // 3. (可选)追加一条用户消息并触发生成
 *        // await generateRaw({ ... });
 *
 *        return {
 *          message: '序章已经准备好了。',
 *          warnings,
 *        };
 *      },
 *    };
 *  }
 *
 * ============================================================================
 */
export function getOpeningIntegration(): OpeningIntegration | null {
  return null;
}

// 上述适配器样例中使用的辅助函数与类型,在此 re-export 便于填卡作者使用。
export { writeOpeningToMvu, synchronizeOpeningWorldbook };
export type { OpeningCommitResult, OpeningIntegration, Draft, WorldbookExclusiveSelection };