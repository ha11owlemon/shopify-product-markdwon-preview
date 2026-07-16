/** Current composition. Add a different integration or tool here; no feature edits required. */
(function startCurrentExtension(toolkit) {
  'use strict';

  toolkit.bootstrap({
    integrationId: 'shopify-product-editor',
    featureIds: ['markdown-preview', 'pricing-calculator']
  });
})(window.OperationsToolkit);
