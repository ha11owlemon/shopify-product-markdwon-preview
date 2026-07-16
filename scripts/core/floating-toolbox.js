/**
 * Shared draggable launcher for page-level tools.
 * Registered items are collapsed into one handle and the handle remembers its
 * nearest screen edge and vertical position on the current browser profile.
 */
(function installFloatingToolbox(toolkit, global) {
  'use strict';

  const POSITION_KEY = 'operationsToolkit.floatingToolboxPosition.v1';
  const DEFAULT_POSITION = { edge: 'right', top: 92 };
  const items = new Map();
  let root = null;
  let handle = null;
  let panel = null;
  let expanded = false;
  let position = Object.assign({}, DEFAULT_POSITION);
  let drag = null;
  let ignoreClick = false;

  const TOOLBOX_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h16v10.25A1.25 1.25 0 0 1 18.75 20h-13.5A1.25 1.25 0 0 1 4 18.75V8.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.25 8.5V6.25A1.25 1.25 0 0 1 9.5 5h5a1.25 1.25 0 0 1 1.25 1.25V8.5M4 13h16M10.5 13v2h3v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function storageArea() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return null;
    return chrome.storage.local;
  }

  function clampTop(top) {
    return Math.max(16, Math.min(Math.round(top), global.innerHeight - 60));
  }

  function applyPosition() {
    if (!root) return;
    position.top = clampTop(position.top);
    root.style.top = position.top + 'px';
    root.style.left = position.edge === 'left' ? '16px' : 'auto';
    root.style.right = position.edge === 'right' ? '16px' : 'auto';
    root.classList.toggle('tb-edge-left', position.edge === 'left');
    root.classList.toggle('tb-open-down', position.top < 132);
  }

  function persistPosition() {
    const area = storageArea();
    if (area) area.set({ [POSITION_KEY]: position });
  }

  function loadPosition() {
    const area = storageArea();
    if (!area) return;
    area.get(POSITION_KEY, function (stored) {
      const saved = stored && stored[POSITION_KEY];
      if (!saved || (saved.edge !== 'left' && saved.edge !== 'right') || !Number.isFinite(saved.top)) return;
      position = { edge: saved.edge, top: saved.top };
      applyPosition();
    });
  }

  function renderItems() {
    if (!panel) return;
    panel.innerHTML = '';
    items.forEach(function (item) {
      const button = document.createElement('button');
      button.className = 'tb-tool-button';
      button.type = 'button';
      button.title = item.label;
      button.setAttribute('aria-label', item.label);
      button.innerHTML = item.icon;
      button.addEventListener('click', function () {
        setExpanded(false);
        item.onClick();
      });
      panel.appendChild(button);
    });
  }

  function setExpanded(nextExpanded) {
    expanded = Boolean(nextExpanded);
    if (root) {
      root.classList.toggle('tb-expanded', expanded);
      handle.setAttribute('aria-expanded', String(expanded));
    }
  }

  function onPointerDown(event) {
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetY: event.clientY - root.getBoundingClientRect().top,
      moved: false
    };
    handle.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const delta = Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY);
    if (delta < 5) return;
    drag.moved = true;
    root.classList.add('tb-dragging');
    position = {
      edge: event.clientX < global.innerWidth / 2 ? 'left' : 'right',
      top: event.clientY - drag.offsetY
    };
    applyPosition();
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.moved) {
      ignoreClick = true;
      persistPosition();
      setTimeout(function () { ignoreClick = false; }, 0);
    }
    root.classList.remove('tb-dragging');
    drag = null;
  }

  function onOutsidePointerDown(event) {
    if (!expanded || !root || !(event.target instanceof Node)) return;
    if (!root.contains(event.target)) setExpanded(false);
  }

  function create() {
    root = document.createElement('div');
    root.id = 'operations-toolbox-launcher';
    root.className = 'tb-edge-right';

    panel = document.createElement('div');
    panel.id = 'operations-toolbox-tools';
    panel.setAttribute('role', 'toolbar');
    panel.setAttribute('aria-label', '工具箱');

    handle = document.createElement('button');
    handle.id = 'operations-toolbox-handle';
    handle.type = 'button';
    handle.title = '打开工具箱，可拖动到屏幕边缘';
    handle.setAttribute('aria-label', '打开工具箱，可拖动到屏幕边缘');
    handle.setAttribute('aria-expanded', 'false');
    handle.innerHTML = TOOLBOX_ICON;
    handle.addEventListener('click', function () {
      if (ignoreClick) {
        ignoreClick = false;
        return;
      }
      setExpanded(!expanded);
    });
    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);

    root.appendChild(panel);
    root.appendChild(handle);
    document.body.appendChild(root);
    document.addEventListener('pointerdown', onOutsidePointerDown);
    renderItems();
    applyPosition();
    loadPosition();
  }

  toolkit.floatingToolbox = {
    register: function (item) {
      if (!item || !item.id || typeof item.onClick !== 'function') {
        throw new Error('A floating toolbox item needs an id and an onClick callback.');
      }
      items.set(item.id, item);
      if (!root) create();
      else renderItems();

      return function unregister() {
        items.delete(item.id);
        if (!items.size && root) {
          document.removeEventListener('pointerdown', onOutsidePointerDown);
          root.remove();
          root = null;
          handle = null;
          panel = null;
          expanded = false;
        } else {
          renderItems();
        }
      };
    }
  };
})(window.OperationsToolkit, window);
