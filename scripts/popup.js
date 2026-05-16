/**
 * 弹出面板 UI
 * 创建悬浮按钮与弹出面板
 */

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

// 打开全局弹出面板
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
