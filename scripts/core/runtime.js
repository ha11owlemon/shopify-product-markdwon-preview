/**
 * Mounts registered features on a registered integration surface.
 * A future non-Shopify surface only needs to implement the integration contract
 * and register the tools it supports.
 */
(function installRuntime(toolkit, global) {
  'use strict';

  toolkit.bootstrap = function bootstrap(options) {
    const integration = toolkit.getIntegration(options.integrationId);
    const featureIds = options.featureIds || [];
    const mountedFeatures = new Map();
    let routeVersion = 0;
    let initTimer = null;
    let lastRouteKey = integration && integration.getRouteKey
      ? integration.getRouteKey()
      : global.location.href;

    if (!integration) {
      throw new Error('Unknown integration: ' + options.integrationId);
    }

    function unmountFeatures() {
      mountedFeatures.forEach(function (controller) {
        if (controller && typeof controller.unmount === 'function') {
          controller.unmount();
        }
      });
      mountedFeatures.clear();
    }

    function mountFeatures() {
      featureIds.forEach(function (featureId) {
        if (mountedFeatures.has(featureId)) return;

        const feature = toolkit.getFeature(featureId);
        if (!feature || (feature.supports && !feature.supports(integration))) return;

        const controller = feature.mount({ integration: integration });
        mountedFeatures.set(featureId, controller || {});
      });
    }

    function initialize(delay) {
      if (initTimer) clearTimeout(initTimer);
      const version = ++routeVersion;
      initTimer = setTimeout(function () {
        initTimer = null;

        if (!integration.matches()) {
          unmountFeatures();
          return;
        }

        integration.waitForReady(function () {
          if (version === routeVersion && integration.matches()) {
            mountFeatures();
          }
        });
      }, delay || 0);
    }

    function handleRouteChange() {
      const nextRouteKey = integration.getRouteKey
        ? integration.getRouteKey()
        : global.location.href;
      if (nextRouteKey === lastRouteKey) return;
      lastRouteKey = nextRouteKey;
      unmountFeatures();
      initialize(500);
    }

    global.addEventListener(integration.routeChangeEvent, handleRouteChange);
    const stopObservingRoutes = integration.observeRouteChanges
      ? integration.observeRouteChanges(handleRouteChange)
      : function () {};
    initialize();

    return {
      unmount: function () {
        if (initTimer) clearTimeout(initTimer);
        global.removeEventListener(integration.routeChangeEvent, handleRouteChange);
        stopObservingRoutes();
        unmountFeatures();
      }
    };
  };
})(window.OperationsToolkit, window);
