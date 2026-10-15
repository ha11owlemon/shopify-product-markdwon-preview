/**
 * Shopify product-editor integration.
 * All brittle Shopify selectors live here so feature modules stay platform-agnostic.
 */
(function registerShopifyProductEditor(toolkit) {
  'use strict';

  // Shopify's quick fields now render native controls inside open shadow roots.
  function queryAll(selector, root) {
    root = root || document;
    const elements = Array.from(root.querySelectorAll(selector));
    root.querySelectorAll('*').forEach(function (element) {
      if (element.shadowRoot) elements.push.apply(elements, queryAll(selector, element.shadowRoot));
    });
    return elements;
  }

  function isVisible(element) {
    return element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true';
  }

  function markdownHost() {
    const hosts = queryAll('s-internal-quick-text-area-field').filter(function (host) {
      const row = host.closest('[id$="-anchor"]');
      if (row && /^PRODUCT\.metafields\./.test(row.id)) {
        return row.id === 'PRODUCT.metafields.custom.markdownDesc-anchor';
      }
      return matchesMarkdownName(host.getAttribute('accessibilitylabel'))
        || host.getAttribute('name') === 'custom.markdownDesc';
    });
    if (hosts.length > 1) throw new Error('检测到多个 Markdown 元字段，请确认商品字段配置');
    return hosts[0] || null;
  }

  function sourceButton() {
    return queryAll('button[aria-label]').find(function (button) {
      return isVisible(button) && /^(显示 HTML|显示编辑器|Show HTML|Show editor)$/i.test(button.getAttribute('aria-label'));
    }) || document.querySelector('[class*="AdditionalActionsContainer"] button');
  }

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
        document.querySelector('input[name="title"], #title-input, [class*="TitleField"] input, iframe[id^="product-description-"]')
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

  function matchesMarkdownName(name) {
    return /^(?:描述[（(]markdown[）)]|custom\.markdownDesc)$/i.test((name || '').replace(/\s/g, ''));
  }

  function findMarkdownField() {
    const candidates = new Set();
    const matchesName = matchesMarkdownName;
    queryAll('textarea, input').forEach(function (field) {
      if (field.closest('#shopify-helper-popup')) return;
      if (!isVisible(field)) return;
      const host = field.getRootNode().host;
      const row = (host || field).closest('[id$="-anchor"]');
      if (row && /^PRODUCT\.metafields\./.test(row.id) && row.id !== 'PRODUCT.metafields.custom.markdownDesc-anchor') return;
      if (host && host === markdownHost()) candidates.add(field);
      if (matchesName(field.name) || matchesName(field.getAttribute('aria-label'))
        || Array.from(field.labels || []).some(function (label) { return matchesName(label.textContent); })
        || (field.getAttribute('aria-labelledby') || '').split(/\s+/).some(function (id) {
          return matchesName(document.getElementById(id)?.textContent);
        })) candidates.add(field);
    });
    if (candidates.size === 0) {
      document.querySelectorAll('[role="dialog"], [role="region"]').forEach(function (panel) {
        if (panel.closest('#shopify-helper-popup') || !panel.getClientRects().length) return;
        if (!Array.from(panel.querySelectorAll('label, h2, h3, span')).some(function (el) { return matchesName(el.textContent); })) return;
        panel.querySelectorAll('textarea').forEach(function (field) { candidates.add(field); });
      });
    }
    if (candidates.size !== 1) throw new Error('请先在商品页面展开“描述（markdown）”元字段输入框，再重试');
    const field = Array.from(candidates)[0];
    if (field.disabled || field.readOnly) throw new Error('“描述（markdown）”当前不可编辑');
    return field;
  }

  async function ensureMarkdownField() {
    try { return findMarkdownField(); } catch (_) {}
    const wrongField = document.getElementById('PRODUCT.metafields.custom.markdown-anchor');
    const host = markdownHost();
    if (host) {
      const activator = host.shadowRoot?.querySelector('fieldset');
      if (!activator) throw new Error('Markdown 元字段组件尚未加载，请稍后重试');
      activator.click();
      for (let attempt = 0; attempt < 50; attempt++) {
        await new Promise(function (resolve) { setTimeout(resolve, 100); });
        try { return findMarkdownField(); } catch (_) {}
      }
      throw new Error('无法展开 Markdown 元字段的多行输入框');
    }
    if (wrongField && !document.getElementById('PRODUCT.metafields.custom.markdownDesc-anchor')) {
      throw new Error('当前店铺缺少 custom.markdownDesc 元字段，请先修正字段定义');
    }
    const labels = Array.from(document.querySelectorAll('label, button, [role="button"], span, p'))
      .filter(function (element) {
        return !element.closest('#shopify-helper-popup') && element.getClientRects().length
          && matchesMarkdownName(element.textContent);
      });
    // Prefer the actual clickable field row; never click a broad page container.
    const targets = new Set(labels.map(function (label) {
      return label.closest('button, [role="button"]') || label;
    }));
    const leafTargets = Array.from(targets).filter(function (target) {
      return !Array.from(targets).some(function (other) { return other !== target && target.contains(other); });
    });
    if (leafTargets.length !== 1) throw new Error('未能唯一定位“描述（markdown）”，请展开该元字段后重试');
    const target = leafTargets[0];
    target.click();
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(function (resolve) { setTimeout(resolve, 100); });
      try { return findMarkdownField(); } catch (_) {}
    }
    throw new Error('已点击元字段，但未找到多行输入框；请展开“描述（markdown）”后重试');
  }

  async function ensureSourceEditor() {
    if (findEditorElement()) return;
    const button = sourceButton();
    if (!button) throw new Error('未找到商品描述的源代码切换按钮');
    button.click();
    for (let attempt = 0; attempt < 80; attempt++) {
      await new Promise(function (resolve) { setTimeout(resolve, 100); });
      if (findEditorElement()) return;
    }
    throw new Error('无法切换到商品描述源代码模式');
  }

  async function writeMarkdownField(value) {
    const field = await ensureMarkdownField();
    const prototype = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value);
    field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: value }));
    field.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    field.blur();
    await new Promise(function (resolve) { setTimeout(resolve, 100); });
    if ((await ensureMarkdownField()).value !== value) throw new Error('Markdown 元字段写入未生效，请重试');
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
      return sourceButton();
    },
    createEditorBridge: function () {
      const source = toolkit.adapters.shopifyCodeMirror.create();
      return {
        read: async function () { return (await ensureMarkdownField()).value; },
        write: async function (markdown, html) {
          await ensureMarkdownField();
          await ensureSourceEditor();
          await writeMarkdownField(markdown);
          const result = await source.write(html);
          if (!result.ok || await source.read() !== html) {
            throw new Error('Markdown 已填入，但商品 HTML 写入失败，请重试');
          }
          return result;
        }
      };
    }
  });
})(window.OperationsToolkit);
