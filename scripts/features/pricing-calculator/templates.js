/** Small local template store for pricing calculator configurations. */
(function registerPricingTemplateStore(toolkit) {
  'use strict';

  const STORAGE_KEY = 'operationsToolkit.pricingTemplates.v1';
  let memoryTemplates = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function localStorageArea() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return null;
    return chrome.storage.local;
  }

  function defaultTemplate(snapshot) {
    return {
      id: 'default',
      name: '默认定价模板',
      state: clone(snapshot),
      updatedAt: Date.now()
    };
  }

  function storageError() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError
      ? chrome.runtime.lastError.message
      : null;
  }

  function write(templates) {
    const area = localStorageArea();
    memoryTemplates = clone(templates);
    if (!area) return Promise.resolve(clone(memoryTemplates));

    return new Promise(function (resolve) {
      area.set({ [STORAGE_KEY]: memoryTemplates }, function () {
        const error = storageError();
        if (error) console.warn('[Toolbox] Unable to save pricing templates:', error);
        resolve(clone(memoryTemplates));
      });
    });
  }

  toolkit.features.pricingTemplates = {
    list: function (initialSnapshot) {
      const area = localStorageArea();
      if (!area) {
        if (memoryTemplates === null) memoryTemplates = [defaultTemplate(initialSnapshot)];
        return Promise.resolve(clone(memoryTemplates));
      }

      return new Promise(function (resolve) {
        area.get(STORAGE_KEY, function (result) {
          const error = storageError();
          if (error) {
            console.warn('[Toolbox] Unable to load pricing templates:', error);
            resolve([]);
            return;
          }

          // An absent key means first use. An explicitly saved empty array is
          // preserved so users may delete every template if they choose.
          if (!Object.prototype.hasOwnProperty.call(result, STORAGE_KEY)) {
            const initial = [defaultTemplate(initialSnapshot)];
            write(initial).then(resolve);
            return;
          }
          const saved = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
          memoryTemplates = clone(saved);
          resolve(clone(memoryTemplates));
        });
      });
    },
    save: write
  };
})(window.OperationsToolkit);
