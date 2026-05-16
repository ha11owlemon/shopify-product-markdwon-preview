/**
 * Shopify Product Helper - Content Script
 * 检测 Shopify 商品编辑页面，在页面底部注入操作按钮
 */

// 判断是否为商品编辑页面（而非商品列表页）
function isProductEditPage() {
  const url = new URL(window.location.href);

  // admin.shopify.com/store/{store}/products/{productId} — 编辑已有商品
  // admin.shopify.com/store/{store}/products/new — 新建商品
  // 路径中包含 /products/ 且后面跟着 productId 或 "new"
  const pathParts = url.pathname.split('/').filter(Boolean);

  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === 'products' && i + 1 < pathParts.length) {
      const nextPart = pathParts[i + 1];
      // 编辑页面：/products/{id} 或 /products/new
      // 列表页面：/products 或 /products?...
      if (/^\d+$/.test(nextPart) || nextPart === 'new') {
        return true;
      }
    }
  }

  return false;
}

// 在页面底部创建悬浮按钮
function createBottomButton() {
  // 避免重复注入
  if (document.getElementById('shopify-helper-btn')) return;

  const container = document.createElement('div');
  container.id = 'shopify-helper-container';

  const button = document.createElement('button');
  button.id = 'shopify-helper-btn';
  button.textContent = '🛒 Shopify Helper';
  button.addEventListener('click', () => {
    openPopup();
  });

  container.appendChild(button);
  document.body.appendChild(container);
}

// 打开全局弹出面板
function openPopup() {
  if (document.getElementById('shopify-helper-popup')) return;

  // 遮罩层
  const overlay = document.createElement('div');
  overlay.id = 'shopify-helper-overlay';

  // 弹出面板
  const popup = document.createElement('div');
  popup.id = 'shopify-helper-popup';
  popup.innerHTML = `
    <div class="sh-popup-header">
      <span class="sh-popup-title">Shopify Helper</span>
      <button class="sh-popup-close" id="shopify-helper-popup-close">✕</button>
    </div>
    <div class="sh-popup-body">
      <p>功能开发中...</p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  // 触发动画（需要先渲染一帧再添加 class）
  requestAnimationFrame(() => {
    overlay.classList.add('sh-overlay-visible');
    popup.classList.add('sh-popup-visible');
  });

  // 关闭事件
  const close = () => {
    overlay.classList.remove('sh-overlay-visible');
    popup.classList.remove('sh-popup-visible');
    setTimeout(() => {
      overlay.remove();
      popup.remove();
    }, 350);
  };

  document.getElementById('shopify-helper-popup-close').addEventListener('click', close);
  overlay.addEventListener('click', close);
}

// 主逻辑
function init() {
  if (isProductEditPage()) {
    createBottomButton();
  }
}

// 页面加载完成后执行
init();

// 监听 URL 变化（Shopify 后台是 SPA，页面切换不会刷新）
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // 移除旧按钮
    const existing = document.getElementById('shopify-helper-container');
    if (existing) existing.remove();
    // 重新检测并注入
    setTimeout(init, 500);
  }
});

observer.observe(document, { subtree: true, childList: true });
