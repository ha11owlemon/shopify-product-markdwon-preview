/**
 * Shopify Product Helper - Content Script
 * 检测 Shopify 商品编辑页面，在页面底部注入操作按钮
 */

// 判断是否为商品编辑页面（而非商品列表页）
function isProductEditPage() {
  const url = new URL(window.location.href);

  // admin.shopify.com/store/{store}/products/{productId} — 编辑已有商品
  // admin.shopify.com/store/{store}/products/new — 新建商品
  const pathParts = url.pathname.split('/').filter(Boolean);

  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === 'products' && i + 1 < pathParts.length) {
      const nextPart = pathParts[i + 1];
      if (/^\d+$/.test(nextPart) || nextPart === 'new') {
        return true;
      }
    }
  }

  return false;
}

// 在页面底部创建悬浮按钮
function createBottomButton() {
  if (document.getElementById('shopify-helper-btn')) return;

  const container = document.createElement('div');
  container.id = 'shopify-helper-container';

  const button = document.createElement('button');
  button.id = 'shopify-helper-btn';
  button.textContent = '🛒 Shopify Helper';
  button.addEventListener('click', () => {
    openPopup();
  });

  container.appendChild(button);
  document.body.appendChild(container);
}

// 多策略查找目标按钮
function findTargetButton() {
  const byPartialClass = document.querySelector('[class*="AdditionalActionsContainer"] button');
  if (byPartialClass) return byPartialClass;
  return null;
}

// ===== 双向同步相关变量 =====
let memoryContent = '';   // 内存备用存储（刷新页面才丢失）
let isSyncing = false;     // 防止循环同步标志
let cmObserver = null;     // CM6 → MD 观察器

// ===== markdown-it 实例（由 manifest 注入的本地脚本提供） =====
let markdownItInstance = null;

function getMarkdownIt() {
  if (markdownItInstance) return markdownItInstance;
  if (typeof window.markdownit === 'function') {
    markdownItInstance = window.markdownit();
    return markdownItInstance;
  }
  return null;
}

// ===== 查找 CodeMirror 6 的 cm-content 元素 =====
function findCmContent() {
  // 策略1：标准 CM6 结构
  const el1 = document.querySelector('.cm-editor .cm-content[contenteditable="true"]');
  if (el1) return el1;

  // 策略2：部分类名匹配
  const el2 = document.querySelector('[class*="cm-content"][contenteditable="true"]');
  if (el2) return el2;

  return null;
}

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

// ===== 更新底部状态指示器（基于 cm-content 是否存在） =====
let cmStatusTimer = null;
let cmStatusDetected = false;

function updateCmStatusIndicator() {
  const dot = document.getElementById('sh-sync-dot');
  const text = document.getElementById('sh-sync-text');
  if (!dot || !text) return;

  const cmExists = !!findCmContent();
  dot.className = 'sh-sync-dot';

  if (cmExists) {
    cmStatusDetected = true;
    dot.classList.add('sh-sync-synced');
    text.textContent = '自动同步';
    text.style.color = '#15803d';
    // 检测到后停止轮询
    stopCmStatusPolling();
  } else if (!cmStatusDetected) {
    // 尚未检测到，显示黄色检测中
    dot.classList.add('sh-sync-detecting');
    text.textContent = '';
    text.style.color = '';
  } else {
    // 之前检测到但现在丢失，显示红色
    dot.classList.add('sh-sync-failed');
    text.textContent = '需要手动复制粘贴';
    text.style.color = '#dc2626';
  }
}

function startCmStatusPolling() {
  if (cmStatusTimer) clearInterval(cmStatusTimer);
  cmStatusDetected = false;
  updateCmStatusIndicator();
  // 每200ms检测一次，持续2s
  cmStatusTimer = setInterval(updateCmStatusIndicator, 200);
  // 2s后如果还没检测到，标记为失败并降低检测频率
  setTimeout(() => {
    if (!cmStatusDetected) {
      stopCmStatusPolling();
      // 最终判定：显示红色
      const dot = document.getElementById('sh-sync-dot');
      const text = document.getElementById('sh-sync-text');
      if (dot && text) {
        dot.className = 'sh-sync-dot sh-sync-failed';
        text.textContent = '需要手动复制粘贴';
        text.style.color = '#dc2626';
      }
      // 降低频率继续监听，以便后续出现时能自动变绿
      cmStatusTimer = setInterval(updateCmStatusIndicator, 2000);
    }
  }, 2000);
}

function stopCmStatusPolling() {
  if (cmStatusTimer) { clearInterval(cmStatusTimer); cmStatusTimer = null; }
}

// ===== 打开全局弹出面板 =====
function openPopup() {
  if (document.getElementById('shopify-helper-popup')) return;

  // 遮罩层
  const overlay = document.createElement('div');
  overlay.id = 'shopify-helper-overlay';

  // 弹出面板
  const popup = document.createElement('div');
  popup.id = 'shopify-helper-popup';
  popup.innerHTML = `
    <div class="sh-popup-header">
      <span class="sh-popup-title">Shopify Helper</span>
      <button class="sh-popup-close" id="shopify-helper-popup-close">✕</button>
    </div>
    <div class="sh-popup-content-area">
      <div class="sh-editor-panel">
        <div class="sh-panel-label">Markdown 编辑</div>
        <textarea id="sh-markdown-input" class="sh-markdown-textarea" placeholder="在此输入 Markdown 内容..."></textarea>
      </div>
      <div class="sh-preview-scroll">
        <div class="sh-preview-panel">
          <div class="sh-panel-label">预览</div>
          <div id="sh-markdown-preview" class="sh-markdown-preview">
            <p class="sh-preview-placeholder">在左侧输入 Markdown 内容，此处将实时渲染预览</p>
          </div>
        </div>
      </div>
    </div>
    <div class="sh-sync-status-bar">
      <span id="sh-sync-dot" class="sh-sync-dot"></span>
      <span id="sh-sync-text" style="font-size: 12px;">检测中...</span>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  // 同时点击目标按钮（仅在 aria-pressed 为 false 时）
  try {
    const targetBtn = findTargetButton();
    if (targetBtn && targetBtn.getAttribute('aria-pressed') === 'false') {
      targetBtn.click();
    }
  } catch (_) { /* 找不到就跳过 */ }

  // 触发动画
  requestAnimationFrame(() => {
    overlay.classList.add('sh-overlay-visible');
    popup.classList.add('sh-popup-visible');
  });

  // 关闭事件
  const close = () => {
    stopCmStatusPolling();
    overlay.classList.remove('sh-overlay-visible');
    popup.classList.remove('sh-popup-visible');
    setTimeout(() => {
      overlay.remove();
      popup.remove();
    }, 350);
  };

  document.getElementById('shopify-helper-popup-close').addEventListener('click', close);
  overlay.addEventListener('click', close);

  // ===== 初始化 Markdown 编辑器逻辑 =====
  const textarea = document.getElementById('sh-markdown-input');
  const preview = document.getElementById('sh-markdown-preview');

  // 初始化 markdown-it
  const md = getMarkdownIt();
  if (!md) {
    preview.innerHTML = '<p style="color:#ef4444;">markdown-it 库加载失败，预览功能不可用</p>';
    return;
  }

  // 从内存恢复内容
  if (memoryContent) {
    textarea.value = memoryContent;
    try { preview.innerHTML = md.render(memoryContent); } catch (_) {}
  }

  // 实时输入处理：渲染预览 + 同步到 CM6（无防抖）
  textarea.addEventListener('input', () => {
    if (isSyncing) return;
    const text = textarea.value;
    memoryContent = text;
    try {
      preview.innerHTML = md.render(text || '');
    } catch (_) {
      preview.innerHTML = '<p style="color:#ef4444;">渲染出错</p>';
    }
    syncMdToCm(text);
  });

  // 尝试连接 CM6 并启动双向观察
  const tryConnectCm = (retries = 0) => {
    const cmEl = findCmContent();
    if (cmEl) {
      // 如果 MD 为空但 CM6 有内容，从 CM6 拉取
      const cmText = getCmText(cmEl);
      if (cmText && !textarea.value) {
        isSyncing = true;
        textarea.value = cmText;
        memoryContent = cmText;
        try { preview.innerHTML = md.render(cmText); } catch (_) {}
        setTimeout(() => { isSyncing = false; }, 100);
      }
      startCmObserver(cmEl, textarea, md);
    } else if (retries < 6) {
      setTimeout(() => tryConnectCm(retries + 1), 500);
    }
  };
  tryConnectCm();

  // 启动状态指示器轮询
  startCmStatusPolling();
}

// 主逻辑
function init() {
  if (isProductEditPage()) {
    createBottomButton();
  }
}

// 页面加载完成后执行
init();

// 监听 URL 变化（Shopify 后台是 SPA，页面切换不会刷新）
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    const existing = document.getElementById('shopify-helper-container');
    if (existing) existing.remove();
    setTimeout(init, 500);
  }
});

observer.observe(document, { subtree: true, childList: true });
