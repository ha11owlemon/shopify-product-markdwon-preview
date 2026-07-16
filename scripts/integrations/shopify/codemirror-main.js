/**
 * CM6 注入脚本 - 运行在页面主世界 (world: "MAIN")
 * 
 * 可以访问 Shopify 页面的 JS 上下文，直接操作 CM6 的 EditorView。
 * 与 content script 通过自定义 DOM 事件通信：
 *   content script → sh-cm-bridge (命令)
 *   MAIN world    → sh-cm-bridge-response (响应)
 */

(function installShopifyCodeMirrorBridge() {
  'use strict';

  function installRouteChangeBridge() {
    if (window.__shopifyHelperRouteBridgeInstalled) return;
    window.__shopifyHelperRouteBridgeInstalled = true;

    const notify = () => {
      window.dispatchEvent(new Event('shopify-helper-location-change'));
    };

    const wrap = (methodName) => {
      const original = history[methodName];
      if (typeof original !== 'function') return;

      history[methodName] = function wrappedHistoryMethod(...args) {
        const result = original.apply(this, args);
        notify();
        return result;
      };
    };

    wrap('pushState');
    wrap('replaceState');
    window.addEventListener('popstate', notify);
  }

  installRouteChangeBridge();

  let cachedView = null;

  function isEditorView(obj) {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.dispatch === 'function' &&
      obj.state &&
      obj.state.doc != null &&
      typeof obj.state.doc.toString === 'function'
    );
  }

  // ===== 策略 1: 遍历 DOM 元素属性 (string + Symbol) =====
  function findViewFromDom() {
    const targets = document.querySelectorAll('.cm-editor, .cm-content');
    for (const el of targets) {
      // 检查字符串属性
      try {
        const names = Object.getOwnPropertyNames(el);
        for (const key of names) {
          try {
            const val = el[key];
            if (val && typeof val === 'object') {
              if (isEditorView(val)) return val;
              if (val.view && isEditorView(val.view)) return val.view;
            }
          } catch (_) {}
        }
      } catch (_) {}

      // 检查 Symbol 属性
      try {
        const symbols = Object.getOwnPropertySymbols(el);
        for (const sym of symbols) {
          try {
            const val = el[sym];
            if (val && typeof val === 'object') {
              if (isEditorView(val)) return val;
              if (val.view && isEditorView(val.view)) return val.view;
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
    return null;
  }

  // ===== 策略 2: 搜索 React Fiber 节点 =====
  function findViewFromReact() {
    const cmEditor = document.querySelector('.cm-editor');
    if (!cmEditor) return null;

    // 找 React fiber key
    const fiberKey = Object.keys(cmEditor).find(
      (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );
    if (!fiberKey) return null;

    const visited = new Set();
    let fiber = cmEditor[fiberKey];

    while (fiber && !visited.has(fiber)) {
      visited.add(fiber);

      // 检查 stateNode
      if (fiber.stateNode && isEditorView(fiber.stateNode)) {
        return fiber.stateNode;
      }

      // 检查 memoizedState 链（React hooks 存储 ref/state 的地方）
      let hookState = fiber.memoizedState;
      let depth = 0;
      while (hookState && depth < 30) {
        if (hookState.memoizedState) {
          const val = hookState.memoizedState;
          if (isEditorView(val)) return val;
          // React ref 模式: { current: EditorView }
          if (val && val.current && isEditorView(val.current)) return val.current;
          // 搜索对象属性
          if (val && typeof val === 'object') {
            try {
              for (const k of Object.keys(val)) {
                try {
                  if (isEditorView(val[k])) return val[k];
                  if (val[k] && val[k].current && isEditorView(val[k].current)) return val[k].current;
                } catch (_) {}
              }
            } catch (_) {}
          }
        }
        hookState = hookState.next;
        depth++;
      }

      // 遍历子节点、兄弟节点
      fiber = fiber.child || fiber.sibling || (fiber.return ? fiber.return.sibling : null);
    }

    return null;
  }

  // ===== 策略 3: 搜索全局作用域 =====
  function findViewFromGlobal() {
    const cmEditor = document.querySelector('.cm-editor');
    if (!cmEditor) return null;

    // 尝试 EditorView.findFromDOM
    try {
      if (typeof EditorView === 'function' && typeof EditorView.findFromDOM === 'function') {
        const view = EditorView.findFromDOM(cmEditor);
        if (isEditorView(view)) return view;
      }
    } catch (_) {}

    // 搜索 window 上的属性，寻找含 findFromDOM 的对象
    try {
      const keys = Object.getOwnPropertyNames(window);
      for (const key of keys) {
        try {
          const val = window[key];
          if (val && typeof val === 'function' && typeof val.findFromDOM === 'function') {
            const view = val.findFromDOM(cmEditor);
            if (isEditorView(view)) return view;
          }
        } catch (_) {}
      }
    } catch (_) {}

    return null;
  }

  // ===== 策略 4: 遍历所有 .cm-editor 的父/子元素 =====
  function findViewFromParentChild() {
    const cmEditor = document.querySelector('.cm-editor');
    if (!cmEditor) return null;

    // 检查所有相邻和父子元素
    const candidates = [
      cmEditor.parentElement,
      cmEditor.parentElement?.parentElement,
      ...Array.from(cmEditor.children),
      ...Array.from(cmEditor.querySelectorAll('*')).slice(0, 50), // 限制搜索范围
    ];

    for (const el of candidates) {
      if (!el) continue;
      try {
        const keys = [...Object.getOwnPropertyNames(el), ...Object.getOwnPropertySymbols(el)];
        for (const key of keys) {
          try {
            const val = el[key];
            if (val && typeof val === 'object') {
              if (isEditorView(val)) return val;
              if (val.view && isEditorView(val.view)) return val.view;
              if (val.current && isEditorView(val.current)) return val.current;
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    return null;
  }

  // ===== 综合查找 =====
  function findView() {
    // 验证缓存
    if (cachedView) {
      try {
        if (isEditorView(cachedView) && cachedView.dom && cachedView.dom.isConnected) {
          return cachedView;
        }
      } catch (_) {}
      cachedView = null;
    }

    cachedView =
      findViewFromDom() ||
      findViewFromReact() ||
      findViewFromGlobal() ||
      findViewFromParentChild();

    if (cachedView) {
      console.log('[ShopifyHelper] EditorView found:', cachedView);
    } else {
      console.warn('[ShopifyHelper] EditorView not found with any strategy');
    }

    return cachedView;
  }

  // ===== 使用 beforeinput 事件的备选写入方式 =====
  function writeViaInputEvent(el, text) {
    el.focus();
    // 先选中所有内容
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // 派发 beforeinput 事件
    const event = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    el.dispatchEvent(event);
  }

  // ===== 监听来自 content script 的命令 =====
  document.addEventListener('sh-cm-bridge', function (e) {
    const { id, cmd, text } = e.detail;

    try {
      if (cmd === 'find') {
        const view = findView();
        document.dispatchEvent(
          new CustomEvent('sh-cm-bridge-response', {
            detail: { id, cmd, ok: true, found: !!view },
          })
        );
        return;
      }

      if (cmd === 'read') {
        const view = findView();
        let result = '';
        if (view && view.state && view.state.doc) {
          result = view.state.doc.toString();
        } else {
          // 回退: 从 DOM 读取
          const cmContent = document.querySelector('.cm-content');
          if (cmContent) {
            const lines = cmContent.querySelectorAll('.cm-line');
            if (lines.length > 0) {
              result = Array.from(lines)
                .map((l) => l.textContent || '')
                .join('\n');
            } else {
              result = cmContent.textContent || '';
            }
          }
        }
        document.dispatchEvent(
          new CustomEvent('sh-cm-bridge-response', {
            detail: { id, cmd, ok: true, result },
          })
        );
        return;
      }

      if (cmd === 'write') {
        const view = findView();
        if (view && view.state) {
          try {
            // 主策略: EditorView.dispatch
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: text },
            });
            console.log('[ShopifyHelper] Write via dispatch OK');
            document.dispatchEvent(
              new CustomEvent('sh-cm-bridge-response', {
                detail: { id, cmd, ok: true, method: 'dispatch' },
              })
            );
          } catch (dispatchErr) {
            // 回退: beforeinput 事件
            console.warn('[ShopifyHelper] dispatch failed, trying beforeinput:', dispatchErr);
            const cmContent = document.querySelector('.cm-content');
            if (cmContent) {
              writeViaInputEvent(cmContent, text);
              document.dispatchEvent(
                new CustomEvent('sh-cm-bridge-response', {
                  detail: { id, cmd, ok: true, method: 'inputEvent' },
                })
              );
            } else {
              document.dispatchEvent(
                new CustomEvent('sh-cm-bridge-response', {
                  detail: { id, cmd, ok: false, error: String(dispatchErr) },
                })
              );
            }
          }
        } else {
          // 没有 view，尝试 beforeinput
          const cmContent = document.querySelector('.cm-content');
          if (cmContent) {
            writeViaInputEvent(cmContent, text);
            document.dispatchEvent(
              new CustomEvent('sh-cm-bridge-response', {
                detail: { id, cmd, ok: true, method: 'inputEvent-fallback' },
              })
            );
          } else {
            document.dispatchEvent(
              new CustomEvent('sh-cm-bridge-response', {
                detail: { id, cmd, ok: false, error: 'view not found, no cm-content' },
              })
            );
          }
        }
        return;
      }
    } catch (err) {
      document.dispatchEvent(
        new CustomEvent('sh-cm-bridge-response', {
          detail: { id, cmd, ok: false, error: err.message || String(err) },
        })
      );
    }
  });

  console.log('[ShopifyHelper] CM6 bridge (MAIN world) ready');
})();
