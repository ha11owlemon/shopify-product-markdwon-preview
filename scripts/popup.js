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

  // Markdown 图标 SVG
  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  iconSvg.setAttribute('width', '20');
  iconSvg.setAttribute('height', '20');
  iconSvg.setAttribute('viewBox', '0 0 1024 1024');
  iconSvg.classList.add('sh-btn-icon');
  iconSvg.innerHTML = '<path d="M950.144 827.104H73.856A73.824 73.824 0 0 1 0.032 753.28V270.72a73.824 73.824 0 0 1 73.824-73.824h876.288a73.824 73.824 0 0 1 73.824 73.824v482.496a73.824 73.824 0 0 1-73.824 73.824z m-704-147.712v-192l98.464 123.104 98.432-123.104v192h98.464v-334.72h-98.464l-98.432 123.104-98.464-123.104H147.68v334.816zM905.856 512h-98.464v-167.392h-98.432V512h-98.464l147.68 172.32z" fill="currentColor"/>';
  button.appendChild(iconSvg);

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
      <span class="sh-popup-title">Markdown效果预览</span>
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
            <div data-markdown-body id="sh-md-content">
              <p class="sh-preview-placeholder">在左侧输入 Markdown 内容，此处将实时渲染预览</p>
            </div>
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
    // 关闭时一次性同步到 CM6
    if (memoryContent) {
      syncMdToCm(memoryContent);
    }
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
  const mdContent = document.getElementById('sh-md-content');

  // 初始化 markdown-it
  var md = getMarkdownIt();
  if (!md) {
    mdContent.innerHTML = '<p style="color:#ef4444;">markdown-it 库加载失败，预览功能不可用</p>';
    return;
  }

  // 1) 优先从内存恢复内容（上次编辑的）
  if (memoryContent) {
    textarea.value = memoryContent;
    try { renderMarkdown(memoryContent, mdContent); } catch (_) {}
  }

  // 2) 尝试从 CM6 读取内容（覆盖内存中的内容，以 CM6 为准）
  const tryReadCm = async (retries = 0) => {
    try {
      const read = await readCmToMd(textarea);
      if (!read && retries < 6) {
        setTimeout(() => tryReadCm(retries + 1), 500);
      }
    } catch (_) {
      if (retries < 6) {
        setTimeout(() => tryReadCm(retries + 1), 500);
      }
    }
  };
  tryReadCm();

  // 3) MD 编辑器输入：仅渲染预览 + 更新内存（关闭时才同步到 CM6）
  textarea.addEventListener('input', () => {
    const text = textarea.value;
    memoryContent = text;
    try {
      renderMarkdown(text || '', mdContent);
    } catch (_) {
      mdContent.innerHTML = '<p style="color:#ef4444;">渲染出错</p>';
    }
  });

  // 启动状态指示器轮询
  startCmStatusPolling();
}
