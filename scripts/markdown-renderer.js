/**
 * Markdown 渲染器
 * 完整移植自 halo-markdown-renderer.liquid 的渲染逻辑
 *
 * 功能：
 * - Admonition 双模式注册（:::type 和 :::!type）
 * - Coupon 优惠券容器（带复制券码功能）
 * - TOC 目录生成（IntersectionObserver 高亮）
 * - markdown-it 配置：html:true, linkify:true, typographer:true, breaks:true
 */

let markdownItInstance = null;

function getMarkdownIt() {
  if (markdownItInstance) return markdownItInstance;
  if (typeof window.markdownit !== 'function') return null;
  if (typeof window.markdownitContainer === 'undefined') {
    console.warn('[Markdown Preview] markdown-it-container not loaded');
  }

  var md = window.markdownit({ html: true, linkify: true, typographer: true, breaks: true });

  // ===== Admonition 双模式注册（type + !type-bang） =====
  function registerAdmonition(md, type, defTitle) {
    md.use(window.markdownitContainer, type, {
      validate: function (params) { return new RegExp('^' + type + '(\\s+.*)?$').test(params.trim()); },
      render: function (tokens, idx) {
        var m = tokens[idx].info.trim().match(new RegExp('^' + type + '\\s+(.*)$'));
        if (tokens[idx].nesting === 1) {
          var title = m && m[1] ? m[1] : defTitle;
          return '<div class="admonition ' + type + '"><p class="admonition-title">' + title + '</p>';
        } else {
          return '</div>';
        }
      }
    });
  }

  function registerAdmonitionDual(md, type, defTitle) {
    registerAdmonition(md, type, defTitle);
    md.use(window.markdownitContainer, type + '-bang', {
      marker: '!',
      validate: function (params) { return new RegExp('^' + type + '(\\s+.*)?$').test(params.trim()); },
      render: function (tokens, idx) {
        var m = tokens[idx].info.trim().match(new RegExp('^' + type + '\\s+(.*)$'));
        if (tokens[idx].nesting === 1) {
          var title = m && m[1] ? m[1] : defTitle;
          return '<div class="admonition ' + type + '"><p class="admonition-title">' + title + '</p>';
        } else {
          return '</div>';
        }
      }
    });
  }

  // 注册所有 admonition 类型（双模式）
  [['note', 'Note'], ['tip', 'Tip'], ['info', 'Info'], ['warning', 'Warning'],
   ['danger', 'Danger'], ['caution', 'Caution'], ['success', 'Success']].forEach(function (t) {
    registerAdmonitionDual(md, t[0], t[1]);
  });

  // ===== Coupon 优惠券容器 =====
  function registerCoupon(md) {
    md.use(window.markdownitContainer, 'coupon', {
      validate: function (params) { return params.trim() === 'coupon'; },
      render: function (tokens, idx) {
        if (tokens[idx].nesting === 1) {
          return '<div class="coupon-container">';
        } else {
          return '</div>';
        }
      }
    });
  }

  registerCoupon(md);

  markdownItInstance = md;
  return markdownItInstance;
}

// ===== 解析优惠券内容 =====
function parseCouponContent(content) {
  var lines = content.trim().split('\n');
  var validity = '';
  var condition = '';
  var value = '';
  var code = '';

  lines.forEach(function (line) {
    line = line.trim();
    if (line.startsWith('有效期：')) {
      validity = line.substring('有效期：'.length).trim();
    } else if (line.startsWith('适用条件：')) {
      condition = line.substring('适用条件：'.length).trim();
    } else if (line.startsWith('金额：')) {
      value = line.substring('金额：'.length).trim();
    } else if (line.startsWith('券码：')) {
      code = line.substring('券码：'.length).trim();
    }
  });

  if (value && code) {
    var conditionStyle = condition
      ? ''
      : 'style="height: 90px"';
    return '<div class="coupon-wrapper">'
      + '<div class="coupon">'
      +   '<div class="coupon-header">'
      +     '<div class="coupon-brand">FYSETC</div>'
      +     '<div class="coupon-validity">' + (validity || '') + '</div>'
      +   '</div>'
      +   '<div class="coupon-body" ' + conditionStyle + '>'
      +     '<div class="coupon-value">' + value + ' off</div>'
      +     '<div class="coupon-condition">' + condition + '</div>'
      +   '</div>'
      +   '<div class="coupon-divider"></div>'
      +   '<div class="coupon-footer">'
      +     '<div class="coupon-code">' + code + '</div>'
      +     '<button class="coupon-button" onclick="window.__shCopyCouponCode(\'' + code + '\', this)">COPY</button>'
      +   '</div>'
      + '</div></div>';
  }
  return content;
}

// ===== 复制优惠券代码到剪贴板（全局函数，供 onclick 调用） =====
window.__shCopyCouponCode = function copyCouponCode(code, button) {
  var originalText = button.textContent;

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(function () {
      showCopySuccess(button, originalText);
    }).catch(function (err) {
      console.error('无法复制代码: ', err);
      fallbackCopyTextToClipboard(code, button, originalText);
    });
  } else {
    fallbackCopyTextToClipboard(code, button, originalText);
  }
};

function fallbackCopyTextToClipboard(code, button, originalText) {
  var textArea = document.createElement("textarea");
  textArea.value = code;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    if (successful) {
      showCopySuccess(button, originalText);
    } else {
      console.error('复制失败');
    }
  } catch (err) {
    console.error('复制失败: ', err);
  } finally {
    document.body.removeChild(textArea);
  }
}

function showCopySuccess(button, originalText) {
  button.textContent = 'COPIED!';
  setTimeout(function () {
    button.textContent = originalText;
  }, 1500);
}

// ===== 生成目录 TOC =====
// 针对浏览器弹出层场景重写：滚动容器是 .sh-markdown-preview，无 sticky navbar
function generateTOC(body) {
  var headings = body.querySelectorAll('h1');
  if (headings.length === 0) return;

  // 弹出层场景：通过 id 直接查找滚动容器
  var scrollContainer = document.getElementById('sh-markdown-preview');

  // 创建TOC容器
  var tocContainer = document.createElement('div');
  tocContainer.className = 'toc-container';

  // 创建TOC列表
  var tocList = document.createElement('ul');
  tocList.className = 'toc-list';

  // 为每个H1标签创建TOC项
  headings.forEach(function (heading, index) {
    var headingId = heading.id || 'heading-' + (index + 1);
    heading.id = headingId;

    var listItem = document.createElement('li');
    listItem.className = 'toc-item';

    // 使用 div 代替 a 标签，避免被 Shopify 页面拦截链接点击事件
    var link = document.createElement('div');
    link.className = 'toc-link';
    link.setAttribute('data-target', headingId);
    link.textContent = heading.textContent;

    // 点击跳转
    (function (targetId) {
      link.addEventListener('click', function () {
        var target = document.getElementById(targetId);
        if (!target) return;

        if (scrollContainer) {
          // 在 .sh-markdown-preview 容器内精确滚动
          var containerRect = scrollContainer.getBoundingClientRect();
          var targetRect = target.getBoundingClientRect();
          var scrollTarget = scrollContainer.scrollTop + (targetRect.top - containerRect.top);
          scrollContainer.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        } else {
          // 回退：使用 scrollIntoView
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    })(headingId);

    listItem.appendChild(link);
    tocList.appendChild(listItem);
  });

  tocContainer.appendChild(tocList);

  // 创建内容容器
  var contentContainer = document.createElement('div');
  contentContainer.className = 'content-container';

  // 移动所有内容到内容容器
  while (body.firstChild) {
    contentContainer.appendChild(body.firstChild);
  }

  // 将TOC和内容容器添加回body
  body.appendChild(tocContainer);
  body.appendChild(contentContainer);

  // IntersectionObserver 高亮 - root 设为弹出层的滚动容器
  var observerOptions = {
    root: scrollContainer || null,
    rootMargin: '0px 0px -70% 0px',
    threshold: 0
  };

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var tocLinks = body.querySelectorAll('.toc-link');
        tocLinks.forEach(function (link) {
          link.classList.remove('active');
        });

        var activeId = entry.target.id;
        var activeLink = body.querySelector('.toc-link[data-target="' + activeId + '"]');
        if (activeLink) {
          activeLink.classList.add('active');
        }
      }
    });
  }, observerOptions);

  headings.forEach(function (heading) {
    observer.observe(heading);
  });

  // 初始化时手动触发一次高亮第一个
  setTimeout(function () {
    var tocLinks = body.querySelectorAll('.toc-link');
    tocLinks.forEach(function (link) {
      link.classList.remove('active');
    });
    if (headings.length > 0) {
      var firstLink = body.querySelector('.toc-link[data-target="' + headings[0].id + '"]');
      if (firstLink) {
        firstLink.classList.add('active');
      }
    }
  }, 100);
}

/**
 * 主渲染函数：将 Markdown 文本渲染到目标元素中
 * @param {string} markdownText - 原始 Markdown 文本
 * @param {HTMLElement} bodyEl - 目标 DOM 元素（应具有 data-markdown-body 属性）
 */
function renderMarkdown(markdownText, bodyEl) {
  var md = getMarkdownIt();
  if (!md) {
    bodyEl.textContent = markdownText;
    return;
  }

  bodyEl.innerHTML = md.render(markdownText);

  // 处理优惠券容器
  var couponContainers = bodyEl.querySelectorAll('.coupon-container');
  couponContainers.forEach(function (couponContainer) {
    var content = couponContainer.textContent || '';
    couponContainer.innerHTML = parseCouponContent(content);
  });

  // 生成 TOC
  generateTOC(bodyEl);
}
