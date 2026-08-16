import type { WorldbookSyncOperation, WorldbookSyncResult } from '../types';

export type WorldbookExclusiveSelection = {
  groupName: string;
  candidateEntries: string[];
  selectedEntry: string;
};

export async function synchronizeOpeningWorldbook(
  worldbookName: string,
  selections: WorldbookExclusiveSelection[],
): Promise<WorldbookSyncOperation> {
  const result: WorldbookSyncResult = {
    applied: false,
    worldbookName,
    enabledEntries: [],
    disabledEntries: [],
    warnings: [],
  };

  const original = await getWorldbook(worldbookName);
  const knownNames = new Set(original.map(entry => entry.name));
  const requiredNames = selections.flatMap(selection => selection.candidateEntries);
  const missingNames = requiredNames.filter(name => !knownNames.has(name));
  if (missingNames.length > 0) {
    result.warnings.push(`未找到世界书条目：${missingNames.join('、')}。已有条目仍会按选择同步。`);
  }

  const missingSelected = selections.filter(selection => !knownNames.has(selection.selectedEntry));
  if (missingSelected.length > 0) {
    result.warnings.push(
      `以下互斥组的目标条目不存在：${missingSelected.map(selection => selection.groupName).join('、')}。已跳过世界书联动。`,
    );
    return { result, rollback: async () => {} };
  }

  const next = original.map(entry => {
    const group = selections.find(selection => selection.candidateEntries.includes(entry.name));
    if (!group) return entry;
    const shouldEnable = entry.name === group.selectedEntry;
    if (entry.enabled !== shouldEnable) {
      (shouldEnable ? result.enabledEntries : result.disabledEntries).push(entry.name);
    }
    return { ...entry, enabled: shouldEnable };
  });

  await replaceWorldbook(worldbookName, next, { render: 'immediate' });

  const verified = await getWorldbook(worldbookName);
  const isValid = selections.every(selection => {
    const enabled = verified.filter(entry => selection.candidateEntries.includes(entry.name) && entry.enabled);
    return enabled.length === 1 && enabled[0].name === selection.selectedEntry;
  });

  if (!isValid) {
    await replaceWorldbook(worldbookName, original, { render: 'immediate' });
    throw new Error('世界书互斥自检失败，修改已回滚。');
  }

  result.applied = true;
  return {
    result,
    rollback: async () => replaceWorldbook(worldbookName, original, { render: 'immediate' }),
  };
}
