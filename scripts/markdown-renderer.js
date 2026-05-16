/**
 * Markdown 渲染器
 * markdown-it 实例管理（由 manifest 注入的本地脚本提供 window.markdownit）
 */

let markdownItInstance = null;

function getMarkdownIt() {
  if (markdownItInstance) return markdownItInstance;
  if (typeof window.markdownit === 'function') {
    markdownItInstance = window.markdownit();
    return markdownItInstance;
  }
  return null;
}
