/**
 * 页面检测与 Shopify DOM 查找工具
 */

// 判断是否为商品编辑页面（而非商品列表页）
function isProductEditPage() {
  const url = new URL(window.location.href);

  // admin.shopify.com/store/{store}/products/{productId} — 编辑已有商品
  // admin.shopify.com/store/{store}/products/new — 新建商品
  const pathParts = url.pathname.split('/').filter(Boolean);

  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === 'products' && i + 1 < pathParts.length) {
      const nextPart = pathParts[i + 1];
      if (/^\d+$/.test(nextPart) || nextPart === 'new') {
        return true;
      }
    }
  }

  return false;
}

// 多策略查找目标按钮
function findTargetButton() {
  const byPartialClass = document.querySelector('[class*="AdditionalActionsContainer"] button');
  if (byPartialClass) return byPartialClass;
  return null;
}

// 查找 CodeMirror 6 的 cm-content 元素
function findCmContent() {
  // 策略1：标准 CM6 结构
  const el1 = document.querySelector('.cm-editor .cm-content[contenteditable="true"]');
  if (el1) return el1;

  // 策略2：部分类名匹配
  const el2 = document.querySelector('[class*="cm-content"][contenteditable="true"]');
  if (el2) return el2;

  return null;
}

// 等待商品编辑表单加载完成
// Shopify SPA 页面加载较慢，需要等待关键表单元素出现
function waitForFormLoad(callback, timeout = 15000) {
  // 检测关键元素：标题输入框、描述编辑器、或商品状态区域
  function checkFormReady() {
    // 策略1：标题输入框
    const titleInput = document.querySelector('input[name="title"], #title-input, [class*="TitleField"] input');
    if (titleInput) return true;

    // 策略2：描述编辑器 (CM6)
    if (document.querySelector('.cm-editor')) return true;

    // 策略3：商品状态选择器
    if (document.querySelector('[class*="ProductStatus"], [class*="StatusSelect"]')) return true;

    // 策略4：通用表单容器（Shopify Polaris 的 FormLayout）
    if (document.querySelector('[class*="FormLayout"], [class*="TextField"]')) return true;

    return false;
  }

  // 立即检查一次
  if (checkFormReady()) {
    callback();
    return;
  }

  // 用 MutationObserver 监听 DOM 变化
  let called = false;
  const timer = setTimeout(() => {
    if (!called) {
      called = true;
      obs.disconnect();
      callback(); // 超时也回调，让按钮出现
    }
  }, timeout);

  const obs = new MutationObserver(() => {
    if (!called && checkFormReady()) {
      called = true;
      clearTimeout(timer);
      obs.disconnect();
      // 稍微延迟让更多内容渲染完
      setTimeout(callback, 300);
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });
}
