/**
 * CodeMirror 6 编辑器桥接
 * 负责 MD ↔ CM6 双向同步
 * 
 * 通过 MAIN world 注入脚本 (cm-inject.js) 与 CM6 通信：
 * - content script 发送 sh-cm-bridge 自定义事件
 * - MAIN world 响应 sh-cm-bridge-response 自定义事件
 * 
 * 同步策略：
 * - 打开 popup 时：从 CM6 读取内容到 MD 编辑器
 * - MD 编辑器输入时：同步内容到 CM6
 * - 内存备用：CM6 不可用时保存在内存中
 */

// 内存备用存储（刷新页面才丢失）
let memoryContent = '';

// ===== 向 MAIN world 发送命令并等待响应 =====
function sendToMainWorld(cmd, text) {
  return new Promise((resolve) => {
    const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const timeout = setTimeout(() => {
      document.removeEventListener('sh-cm-bridge-response', handler);
      resolve({ ok: false, error: 'timeout' });
    }, 3000);

    function handler(e) {
      if (e.detail && e.detail.id === id) {
        clearTimeout(timeout);
        document.removeEventListener('sh-cm-bridge-response', handler);
        resolve(e.detail);
      }
    }

    document.addEventListener('sh-cm-bridge-response', handler);
    document.dispatchEvent(
      new CustomEvent('sh-cm-bridge', { detail: { id, cmd, text } })
    );
  });
}

// ===== 检查 CM6 是否可用 =====
async function isCmAvailable() {
  const resp = await sendToMainWorld('find');
  return resp.ok && resp.found;
}

// ===== 读取 CM6 编辑器内容 =====
async function getCmTextAsync() {
  const resp = await sendToMainWorld('read');
  if (resp.ok) return resp.result || '';
  return '';
}

// ===== 写入内容到 CM6 编辑器 =====
async function setCmTextAsync(text) {
  const resp = await sendToMainWorld('write', text);
  return resp;
}

// ===== MD → CM6 同步 =====
function syncMdToCm(text) {
  memoryContent = text;
  // 异步发送，不需要等待结果（不阻塞输入）
  setCmTextAsync(text).then((resp) => {
    if (resp.ok) {
      // 成功 - 让状态指示器知道
    } else {
      console.warn('[ShopifyHelper] syncMdToCm failed:', resp.error);
    }
  }).catch(() => {});
}

// ===== 从 CM6 读取内容到 MD 编辑器（打开 popup 时调用） =====
async function readCmToMd(textarea) {
  const cmText = await getCmTextAsync();
  if (cmText) {
    // 有内容：解码后更新编辑器
    const decoded = cmText.replace(/&gt;/g, '>');
    memoryContent = decoded;
    textarea.value = decoded;
    const mdContent = document.getElementById('sh-md-content');
    if (mdContent) {
      try { renderMarkdown(decoded, mdContent); } catch (_) {}
    }
    return true;
  }

  // cmText 为空：需要区分"CM6 尚未就绪"还是"描述确实为空"
  const available = await isCmAvailable();
  if (available) {
    // CM6 已就绪但内容为空 → 清空编辑器
    memoryContent = '';
    textarea.value = '';
    const mdContent = document.getElementById('sh-md-content');
    if (mdContent) {
      try { renderMarkdown('', mdContent); } catch (_) {}
    }
    return true;
  }

  // CM6 尚未就绪 → 返回 false 让外层重试
  return false;
}
