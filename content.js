/**
 * Shopify Product Helper - 入口文件
 * 检测 Shopify 商品编辑页面，等待表单加载后初始化插件
 */

// 主逻辑
function init() {
  if (isProductEditPage()) {
    waitForFormLoad(() => {
      createBottomButton();
    });
  }
}

// 页面加载完成后执行
init();

// 监听 URL 变化（Shopify 后台是 SPA，页面切换不会刷新）
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    const existing = document.getElementById('shopify-helper-container');
    if (existing) existing.remove();
    setTimeout(init, 500);
  }
});

observer.observe(document, { subtree: true, childList: true });
