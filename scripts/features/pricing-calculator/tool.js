/** Registers the AliExpress pricing calculator on Shopify product pages. */
(function registerPricingCalculatorTool(toolkit) {
  'use strict';

  const CALCULATOR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="2.5" width="15" height="19" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 6.5h8M8 11h1M11.5 11h1M15 11h1M8 14.5h1M11.5 14.5h1M15 14.5h1M8 18h1M11.5 18h4.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>';

  toolkit.registerFeature({
    id: 'pricing-calculator',
    supports: function (integration) {
      return integration.id === 'shopify-product-editor';
    },
    mount: function () {
      const panel = toolkit.features.pricingPanel.create();
      const unregister = toolkit.floatingToolbox.register({
        id: 'pricing-calculator',
        label: '速卖通定价计算器',
        icon: CALCULATOR_ICON,
        onClick: panel.open
      });
      return {
        unmount: function () {
          panel.close();
          unregister();
        }
      };
    }
  });
})(window.OperationsToolkit);
