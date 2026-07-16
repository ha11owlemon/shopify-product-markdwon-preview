/** Shopify-specific bridge between the isolated content script and CM6. */
(function registerCodeMirrorAdapter(toolkit) {
  'use strict';

  const REQUEST_EVENT = 'sh-cm-bridge';
  const RESPONSE_EVENT = 'sh-cm-bridge-response';

  function send(cmd, text) {
    return new Promise(function (resolve) {
      const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      const timeout = setTimeout(function () {
        document.removeEventListener(RESPONSE_EVENT, handler);
        resolve({ ok: false, error: 'timeout' });
      }, 3000);

      function handler(event) {
        if (event.detail && event.detail.id === id) {
          clearTimeout(timeout);
          document.removeEventListener(RESPONSE_EVENT, handler);
          resolve(event.detail);
        }
      }

      document.addEventListener(RESPONSE_EVENT, handler);
      document.dispatchEvent(new CustomEvent(REQUEST_EVENT, { detail: { id: id, cmd: cmd, text: text } }));
    });
  }

  toolkit.adapters.shopifyCodeMirror = {
    create: function () {
      return {
        isAvailable: async function () {
          const response = await send('find');
          return response.ok && response.found;
        },
        read: async function () {
          const response = await send('read');
          return response.ok ? (response.result || '') : '';
        },
        write: function (text) {
          return send('write', text);
        }
      };
    }
  };
})(window.OperationsToolkit);
