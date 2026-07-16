# Shopify Markdown Preview

A Chrome / Edge browser extension that adds a real-time Markdown preview panel to the Shopify product editor, with rendering styles matching the [Ella Shopify theme](https://themeforest.net/item/ella-multipurpose-shopify-theme-os-20/23080797).

## Features

- **One-click preview** — A floating button appears on the Shopify product edit page; click it to open a split-panel editor with live Markdown rendering.
- **Ella theme fidelity** — Heading sizes, link styles, admonition blocks, coupon containers, and tables all replicate the Ella theme's CSS (including the `62.5%` root font-size trick).
- **CodeMirror 6 sync** — Reads from and writes back to the Shopify editor's underlying CodeMirror 6 instance, so your changes persist natively.
- **Table of Contents** — Auto-generated sticky TOC from `h1` headings with IntersectionObserver-based active highlighting and smooth-scroll navigation.
- **Admonition blocks** — `:::note`, `:::tip`, `:::info`, `:::warning`, `:::danger`, `:::caution`, `:::success` (with `:::!` bang syntax variant).
- **Coupon containers** — `:::coupon` blocks with copy-to-clipboard functionality.
- **SPA-aware** — Detects URL changes in Shopify's single-page admin without page reloads.

## Installation

### Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this project folder

### Edge

1. Open `edge://extensions/`
2. Enable **Developer mode** (left panel toggle)
3. Click **Load extension**
4. Select this project folder

## Architecture

The extension is now organized as a small operations-tool platform. The
current Shopify Markdown preview is its first registered feature; its existing
behaviour has not changed.

- `scripts/core/` contains the feature registry and lifecycle runtime.
- `scripts/integrations/shopify/` contains all Shopify-specific DOM and
  CodeMirror details.
- `scripts/features/markdown/` contains the Markdown preview feature only.
- `scripts/bootstrap.js` selects the integration and features to mount.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the feature and integration
contracts used to add future operations tools.

## Supported Pages

The extension activates only on Shopify product edit pages:

- `https://admin.shopify.com/store/{store}/products/{productId}`
- `https://{store}.myshopify.com/admin/products/{productId}`

> Only product **edit** pages are matched (URL contains a numeric product ID after `/products/`). Product list pages are ignored.

## How It Works

1. **`cm-inject.js`** runs in the `MAIN` world and exposes the CodeMirror 6 editor instance on `window`.
2. **`cm-bridge.js`** reads from and writes to that instance via `window.postMessage`.
3. When the floating button is clicked, **`popup.js`** opens a panel with a Markdown textarea and a preview pane.
4. **`markdown-renderer.js`** renders the Markdown using `markdown-it` with Ella-theme-matching styles.
5. On panel close, the textarea content is synced back to CodeMirror 6.

## License

MIT
