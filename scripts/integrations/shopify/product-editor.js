/**
 * Shopify product-editor integration.
 * All brittle Shopify selectors live here so feature modules stay platform-agnostic.
 */
(function registerShopifyProductEditor(toolkit) {
  'use strict';

  function matchesProductEditor() {
    const pathParts = new URL(window.location.href).pathname.split('/').filter(Boolean);
    return pathParts.some(function (part, index) {
      const nextPart = pathParts[index + 1];
      return part === 'products' && (/^\d+$/.test(nextPart) || nextPart === 'new');
    });
  }

  function findEditorElement() {
    return document.querySelector('.cm-editor .cm-content[contenteditable="true"]')
      || document.querySelector('[class*="cm-content"][contenteditable="true"]');
  }

  function waitForReady(callback, timeout) {
    const maxWait = timeout || 15000;
    const formIsReady = function () {
      return Boolean(
        document.querySelector('input[name="title"], #title-input, [class*="TitleField"] input')
        || document.querySelector('.cm-editor')
        || document.querySelector('[class*="ProductStatus"], [class*="StatusSelect"]')
        || document.querySelector('[class*="FormLayout"], [class*="TextField"]')
      );
    };

    if (formIsReady()) {
      callback();
      return;
    }

    let called = false;
    const observer = new MutationObserver(function () {
      if (!called && formIsReady()) {
        called = true;
        clearTimeout(timer);
        observer.disconnect();
        setTimeout(callback, 300);
      }
    });
    const timer = setTimeout(function () {
      if (!called) {
        called = true;
        observer.disconnect();
        callback();
      }
    }, maxWait);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  toolkit.registerIntegration({
    id: 'shopify-product-editor',
    routeChangeEvent: 'shopify-helper-location-change',
    getRouteKey: function () {
      return window.location.href;
    },
    observeRouteChanges: function (onPossibleRouteChange) {
      const observer = new MutationObserver(onPossibleRouteChange);
      observer.observe(document, { subtree: true, childList: true });
      return function () {
        observer.disconnect();
      };
    },
    matches: matchesProductEditor,
    waitForReady: waitForReady,
    hasEditorElement: function () {
      return Boolean(findEditorElement());
    },
    findAdditionalActionsButton: function () {
      return document.querySelector('[class*="AdditionalActionsContainer"] button');
    },
    createEditorBridge: function () {
      return toolkit.adapters.shopifyCodeMirror.create();
    }
  });
})(window.OperationsToolkit);
