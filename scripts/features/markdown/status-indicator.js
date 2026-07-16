/** Status indicator used by the Markdown feature's Shopify editor bridge. */
(function registerStatusIndicator(toolkit) {
  'use strict';

  toolkit.features.markdownStatus = {
    create: function (hasEditorElement) {
      let timer = null;
      let detected = false;

      function update() {
        const dot = document.getElementById('sh-sync-dot');
        const text = document.getElementById('sh-sync-text');
        if (!dot || !text) return;

        dot.className = 'sh-sync-dot';
        if (hasEditorElement()) {
          detected = true;
          dot.classList.add('sh-sync-synced');
          text.textContent = '自动同步';
          text.style.color = '#15803d';
          stop();
        } else if (!detected) {
          dot.classList.add('sh-sync-detecting');
          text.textContent = '';
          text.style.color = '';
        } else {
          dot.classList.add('sh-sync-failed');
          text.textContent = '需要手动复制粘贴';
          text.style.color = '#dc2626';
        }
      }

      function stop() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }

      return {
        start: function () {
          stop();
          detected = false;
          update();
          timer = setInterval(update, 200);
          setTimeout(function () {
            if (!detected) {
              stop();
              const dot = document.getElementById('sh-sync-dot');
              const text = document.getElementById('sh-sync-text');
              if (dot && text) {
                dot.className = 'sh-sync-dot sh-sync-failed';
                text.textContent = '需要手动复制粘贴';
                text.style.color = '#dc2626';
              }
              timer = setInterval(update, 2000);
            }
          }, 2000);
        },
        stop: stop
      };
    }
  };
})(window.OperationsToolkit);
