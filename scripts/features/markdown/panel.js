/**
 * Markdown preview panel.
 * This is a feature-level UI controller: it knows nothing about Shopify DOM
 * selectors and only talks to the integration's editor bridge contract.
 */
(function registerMarkdownPanel(toolkit) {
  'use strict';

  toolkit.features.markdownPanel = {
    create: function (integration, bridge) {
      let memoryContent = '';

      function renderInto(content, element) {
        try {
          toolkit.features.markdown.render(content || '', element);
        } catch (_) {
          element.innerHTML = '<p style="color:#ef4444;">渲染出错</p>';
        }
      }

      function readEditorInto(textarea, output) {
        return bridge.read().then(function (editorText) {
          memoryContent = editorText;
          textarea.value = editorText;
          renderInto(editorText, output);
          return true;
        });
      }

      function open() {
        if (document.getElementById('shopify-helper-popup')) return;

        const overlay = document.createElement('div');
        overlay.id = 'shopify-helper-overlay';

        const popup = document.createElement('div');
        popup.id = 'shopify-helper-popup';
        popup.innerHTML = `
          <div class="sh-popup-header">
            <span class="sh-popup-title">Markdown效果预览</span>
            <button class="sh-popup-close" id="shopify-helper-popup-close">×</button>
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

        requestAnimationFrame(function () {
          overlay.classList.add('sh-overlay-visible');
          popup.classList.add('sh-popup-visible');
        });

        let loaded = false;
        let busy = false;
        const route = integration.getRouteKey();
        const showStatus = function (message, failed) {
          document.getElementById('sh-sync-text').textContent = message;
          document.getElementById('sh-sync-dot').className = 'sh-sync-dot ' + (failed ? 'sh-sync-failed' : 'sh-sync-synced');
        };
        const close = async function () {
          if (busy) return;
          if (loaded) {
            busy = true;
            textarea.disabled = true;
            try {
              if (integration.getRouteKey() !== route) throw new Error('商品页面已切换，请复制保留编辑内容后重新打开');
              const html = toolkit.features.markdown.toDescriptionHtml(memoryContent);
              showStatus('正在填入 Markdown 和 HTML…');
              await bridge.write(memoryContent, html);
            } catch (error) {
              showStatus(error.message, true);
              busy = false;
              textarea.disabled = false;
              return;
            }
          }
          overlay.classList.remove('sh-overlay-visible');
          popup.classList.remove('sh-popup-visible');
          setTimeout(function () {
            overlay.remove();
            popup.remove();
          }, 350);
        };

        document.getElementById('shopify-helper-popup-close').addEventListener('click', close);
        overlay.addEventListener('click', close);

        const textarea = document.getElementById('sh-markdown-input');
        const output = document.getElementById('sh-md-content');
        if (!toolkit.features.markdown.isAvailable()) {
          output.innerHTML = '<p style="color:#ef4444;">markdown-it 库加载失败，预览功能不可用</p>';
          return;
        }

        textarea.disabled = true;
        memoryContent = '';
        readEditorInto(textarea, output).then(function () {
          if (!popup.isConnected) return;
          loaded = true;
          textarea.disabled = false;
          showStatus('已读取 Markdown；关闭时填入两个字段，之后请在 Shopify 点击保存');
        }).catch(function (error) {
          if (popup.isConnected) showStatus(error.message, true);
        });

        textarea.addEventListener('input', function () {
          memoryContent = textarea.value;
          renderInto(memoryContent, output);
        });

      }

      return { open: open };
    }
  };
})(window.OperationsToolkit);
