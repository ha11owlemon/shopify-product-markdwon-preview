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
      let status = null;

      function renderInto(content, element) {
        try {
          toolkit.features.markdown.render(content || '', element);
        } catch (_) {
          element.innerHTML = '<p style="color:#ef4444;">渲染出错</p>';
        }
      }

      function readEditorInto(textarea, output) {
        return bridge.read().then(function (editorText) {
          if (editorText) {
            const decoded = editorText.replace(/&gt;/g, '>');
            memoryContent = decoded;
            textarea.value = decoded;
            renderInto(decoded, output);
            return true;
          }

          return bridge.isAvailable().then(function (available) {
            if (!available) return false;
            memoryContent = '';
            textarea.value = '';
            renderInto('', output);
            return true;
          });
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

        try {
          const targetButton = integration.findAdditionalActionsButton();
          if (targetButton && targetButton.getAttribute('aria-pressed') === 'false') {
            targetButton.click();
          }
        } catch (_) {}

        requestAnimationFrame(function () {
          overlay.classList.add('sh-overlay-visible');
          popup.classList.add('sh-popup-visible');
        });

        const close = function () {
          if (memoryContent) bridge.write(memoryContent).catch(function () {});
          if (status) status.stop();
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

        if (memoryContent) {
          textarea.value = memoryContent;
          renderInto(memoryContent, output);
        }

        const tryReadEditor = function (retries) {
          readEditorInto(textarea, output).then(function (read) {
            if (!read && retries < 6) setTimeout(function () { tryReadEditor(retries + 1); }, 500);
          }).catch(function () {
            if (retries < 6) setTimeout(function () { tryReadEditor(retries + 1); }, 500);
          });
        };
        tryReadEditor(0);

        textarea.addEventListener('input', function () {
          memoryContent = textarea.value;
          renderInto(memoryContent, output);
        });

        status = toolkit.features.markdownStatus.create(integration.hasEditorElement);
        status.start();
      }

      return { open: open };
    }
  };
})(window.OperationsToolkit);
