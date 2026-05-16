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
