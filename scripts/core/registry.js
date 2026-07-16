/**
 * Extension-wide registry.
 *
 * Content scripts are loaded as classic scripts, so this small registry is the
 * explicit boundary between independently loaded modules. Features only depend
 * on the public contracts registered here, never on another feature's globals.
 */
(function createOperationsToolkit(global) {
  'use strict';

  const integrations = new Map();
  const features = new Map();

  function register(collection, definition, type) {
    if (!definition || typeof definition.id !== 'string' || !definition.id) {
      throw new Error('A ' + type + ' must provide a non-empty id.');
    }
    if (collection.has(definition.id)) {
      throw new Error('Duplicate ' + type + ' id: ' + definition.id);
    }
    collection.set(definition.id, Object.freeze(definition));
  }

  global.OperationsToolkit = {
    adapters: Object.create(null),
    features: Object.create(null),
    registerIntegration(definition) {
      register(integrations, definition, 'integration');
    },
    registerFeature(definition) {
      register(features, definition, 'feature');
    },
    getIntegration(id) {
      return integrations.get(id);
    },
    getFeature(id) {
      return features.get(id);
    }
  };
})(window);
