/**
 * CodeMirror 6 编辑器桥接
 * 负责 MD ↔ CM6 双向同步
 */

// ===== 双向同步状态 =====
let memoryContent = '';   // 内存备用存储（刷新页面才丢失）
let isSyncing = false;    // 防止循环同步标志
let cmObserver = null;    // CM6 → MD 观察器

// ===== 读取 CM6 编辑器内容 =====
function getCmText(el) {
  const lines = el.querySelectorAll('.cm-line');
  if (lines.length === 0) return el.textContent || '';
  return Array.from(lines).map(line => line.textContent || '').join('\n');
}

// ===== 写入内容到 CM6 编辑器 =====
function setCmText(el, text) {
  el.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand('insertText', false, text);
}

// ===== MD → CM6 同步 =====
function syncMdToCm(text) {
  memoryContent = text;
  const el = findCmContent();
  if (!el) return;

  const currentCmText = getCmText(el);
  if (currentCmText === text) return;
  try {
    isSyncing = true;
    setCmText(el, text);
  } catch (_) { /* 忽略写入错误 */ }
  setTimeout(() => { isSyncing = false; }, 100);
}

// ===== 启动 CM6 变更观察器（CM6 → MD 方向） =====
function startCmObserver(cmEl, textarea, md) {
  if (cmObserver) { cmObserver.disconnect(); cmObserver = null; }

  cmObserver = new MutationObserver(() => {
    if (isSyncing) return;
    const cmText = getCmText(cmEl);
    if (cmText === textarea.value) return;
    isSyncing = true;
    memoryContent = cmText;
    textarea.value = cmText;
    const preview = document.getElementById('sh-markdown-preview');
    if (md && preview) {
      try { preview.innerHTML = md.render(cmText || ''); } catch (_) {}
    }
    setTimeout(() => { isSyncing = false; }, 100);
  });

  cmObserver.observe(cmEl, { childList: true, characterData: true, subtree: true });
}
