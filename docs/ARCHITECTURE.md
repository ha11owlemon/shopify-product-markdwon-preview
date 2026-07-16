# Extension architecture

This extension is structured as an operations-tool platform. It currently
ships Shopify Markdown preview and an AliExpress pricing calculator as separate
features.

## Layers

```text
scripts/bootstrap.js
        |
scripts/core/              shared registry and lifecycle runtime
        |
scripts/integrations/      site-specific adapters and DOM/bridge details
        |
scripts/features/          independently mountable operations tools
```

- `core/registry.js` is the only cross-module public boundary. It registers
  integrations and features under `window.OperationsToolkit`.
- `core/runtime.js` mounts the requested features when an integration surface
  matches the current page and tears them down on route changes.
- `core/floating-toolbox.js` provides one draggable, edge-snapping launcher for
  page-level tools. Features register an item instead of creating their own
  fixed button.
- `integrations/shopify/` owns Shopify URL recognition, fragile DOM selectors,
  and the CodeMirror bridge. No feature should query Shopify DOM directly.
- `features/markdown/` owns the current Markdown button, panel, renderer, and
  sync-status UI. It asks the integration for an editor bridge instead of
  accessing CodeMirror itself.
- `features/pricing-calculator/` owns the AliExpress formula model, its panel,
  local-template store, and its product-page launcher. It does not depend on
  CodeMirror.

## Adding a future tool

1. Create `scripts/features/<tool-id>/` with the tool's UI and domain logic.
2. Register it with `OperationsToolkit.registerFeature({ id, supports, mount })`.
3. Add the feature script to `manifest.json`, after its dependencies.
4. Add its id to `featureIds` in `scripts/bootstrap.js` for each surface where
   it should appear.

If the tool is not Shopify-specific, do not put it under `integrations/shopify`.
Create a general browser surface or another platform integration instead. The
tool then receives only the small context it needs.

## Adding a future platform

Register an integration that provides this contract:

- `id`
- `routeChangeEvent`
- `getRouteKey()`
- `observeRouteChanges(callback)`
- `matches()`
- `waitForReady(callback)`

Features may opt into an integration with `supports(integration)`. Optional
methods, such as the Shopify editor bridge, are capabilities for the features
that need them rather than global assumptions.

## Current composition

The active composition has one integration and two features:

```js
{
  integrationId: 'shopify-product-editor',
  featureIds: ['markdown-preview', 'pricing-calculator']
}
```

The calculator does not add a storage permission, external service, or new page
scope. Formula overrides are scoped to its currently open panel.
