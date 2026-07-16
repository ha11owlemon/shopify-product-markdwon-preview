/** Registers the existing Markdown preview as a reusable operations-tool feature. */
(function registerMarkdownPreviewTool(toolkit) {
  'use strict';

  const BUTTON_ID = 'shopify-helper-btn';
  const CONTAINER_ID = 'shopify-helper-container';

  function createButton(onClick) {
    if (document.getElementById(BUTTON_ID)) return;

    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    const button = document.createElement('button');
    button.id = BUTTON_ID;

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('width', '20');
    icon.setAttribute('height', '20');
    icon.setAttribute('viewBox', '0 0 1024 1024');
    icon.classList.add('sh-btn-icon');
    icon.innerHTML = '<path d="M950.144 827.104H73.856A73.824 73.824 0 0 1 0.032 753.28V270.72a73.824 73.824 0 0 1 73.824-73.824h876.288a73.824 73.824 0 0 1 73.824 73.824v482.496a73.824 73.824 0 0 1-73.824 73.824z m-704-147.712v-192l98.464 123.104 98.432-123.104v192h98.464v-334.72h-98.464l-98.432 123.104-98.464-123.104H147.68v334.816zM905.856 512h-98.464v-167.392h-98.432V512h-98.464l147.68 172.32z" fill="currentColor"/>';
    button.appendChild(icon);
    button.addEventListener('click', onClick);
    container.appendChild(button);
    document.body.appendChild(container);
  }

  function removeButton() {
    const container = document.getElementById(CONTAINER_ID);
    if (container) container.remove();
  }

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
      createButton(panel.open);
      return { unmount: removeButton };
    }
  });
})(window.OperationsToolkit);
