/**
 * 运行环境检测。
 *
 * 不再硬依赖 `waitGlobalInitialized` / `getVariables` / `getCurrentMessageId` 等任意全局符号同时存在;
 * 只通过 `getIframeName()` 在 try-catch 中失败的语义来判别是否处在酒馆楼层 iframe 内,
 * 失败一律视作本地预览,前端依然可完整走完四步演示。
 */
function detectTavern(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return typeof getIframeName === 'function' && Boolean(getIframeName());
  } catch {
    return false;
  }
}

export const isTavernRuntime = detectTavern();