/** Registers the existing Markdown preview as a reusable operations-tool feature. */
(function registerMarkdownPreviewTool(toolkit) {
  'use strict';

  // Preserve the original Markdown glyph while rendering it in the shared launcher.
  const MARKDOWN_ICON = '<svg viewBox="0 0 1024 1024" aria-hidden="true"><path d="M950.144 827.104H73.856A73.824 73.824 0 0 1 0.032 753.28V270.72a73.824 73.824 0 0 1 73.824-73.824h876.288a73.824 73.824 0 0 1 73.824 73.824v482.496a73.824 73.824 0 0 1-73.824 73.824z m-704-147.712v-192l98.464 123.104 98.432-123.104v192h98.464v-334.72h-98.464l-98.432 123.104-98.464-123.104H147.68v334.816zM905.856 512h-98.464v-167.392h-98.432V512h-98.464l147.68 172.32z" fill="currentColor"/></svg>';

  toolkit.registerFeature({
    id: 'markdown-preview',
    supports: function (integration) {
      return integration.id === 'shopify-product-editor';
    },
    mount: function (context) {
      const panel = toolkit.features.markdownPanel.create(
        context.integration,
        context.integration.createEditorBridge()
      );
      const unregister = toolkit.floatingToolbox.register({
        id: 'markdown-preview',
        label: 'Markdown 预览',
        icon: MARKDOWN_ICON,
        onClick: panel.open
      });
      return { unmount: unregister };
    }
  });
})(window.OperationsToolkit);
