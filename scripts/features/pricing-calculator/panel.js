/** UI controller for the AliExpress pricing calculator. */
(function registerPricingPanel(toolkit) {
  'use strict';

  function formatNumber(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '';
    return Number(value).toFixed(2);
  }

  function formatDiscount(discount) {
    return formatNumber(discount * 10) + '折';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function inputField(label, field, value, unit) {
    return `
      <label class="pc-field">
        <span class="pc-field-label">${label}<small>${unit}</small></span>
        <span class="pc-input-control">
          <input class="pc-input" type="number" step="0.01" data-input="${field}" value="${formatNumber(value)}">
          ${copyButton(value)}
        </span>
      </label>`;
  }

  const COPY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 9V5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15H9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const COPIED_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 9.5 17 19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function copyButton(value) {
    const formatted = formatNumber(value);
    return `<button class="pc-copy-value" type="button" data-copy-value="${formatted}" title="复制数值" aria-label="复制数值"${formatted ? '' : ' disabled'}>${COPY_ICON}</button>`;
  }

  function formulaField(label, field, value, unit, overridden, key) {
    const keyAttribute = key ? ` data-key="${key}"` : '';
    const status = overridden
      ? '<span class="pc-override-badge">已修改</span>'
      : '<span class="pc-auto-label">自动计算</span>';
    const resetButton = overridden
      ? `<button class="pc-reset-field" type="button" data-reset="${field}"${keyAttribute}>恢复计算</button>`
      : '';
    return `
      <div class="pc-field pc-formula-field${overridden ? ' pc-field-overridden' : ''}">
        <div class="pc-field-label-row">
          <span class="pc-field-label">${label}<small>${unit}</small></span>
          ${status}
        </div>
        <div class="pc-formula-control">
          <input class="pc-input pc-formula-input" type="number" step="0.01" data-formula="${field}"${keyAttribute} value="${formatNumber(value)}" placeholder="自动计算">
          ${copyButton(value)}
          ${resetButton}
        </div>
      </div>`;
  }

  toolkit.features.pricingPanel = {
    create: function () {
      const calculator = toolkit.features.pricingFormula.create();
      let panel = null;
      let templates = [];
      let templatesReady = false;
      let activeTemplateId = null;
      let templateMessage = '';

      function activeTemplate() {
        return templates.find(function (template) { return template.id === activeTemplateId; });
      }

      function templateSection() {
        const selected = activeTemplate();
        const options = templates.length
          ? templates.map(function (template) {
            return `<option value="${escapeHtml(template.id)}"${template.id === activeTemplateId ? ' selected' : ''}>${escapeHtml(template.name)}</option>`;
          }).join('')
          : '<option value="">暂无模板</option>';
        return `
          <section class="pc-template-section">
            <div class="pc-template-heading"><h3>配置模板</h3><span>保存当前输入与手动修改</span></div>
            <div class="pc-template-select-row">
              <select class="pc-template-select" data-template-select${templatesReady && templates.length ? '' : ' disabled'}>${options}</select>
              <button class="pc-template-button" type="button" data-action="template-load"${selected ? '' : ' disabled'}>载入</button>
            </div>
            <div class="pc-template-actions">
              <button class="pc-template-button" type="button" data-action="template-save-as">新增模板</button>
              <button class="pc-template-button" type="button" data-action="template-update"${selected ? '' : ' disabled'}>更新模板</button>
              <button class="pc-template-button pc-template-delete" type="button" data-action="template-delete"${selected ? '' : ' disabled'}>删除</button>
            </div>
            ${templateMessage ? `<p class="pc-template-message">${escapeHtml(templateMessage)}</p>` : ''}
          </section>`;
      }

      function saveTemplates(message) {
        toolkit.features.pricingTemplates.save(templates).then(function () {
          templateMessage = message;
          render();
        });
      }

      function loadTemplateList() {
        toolkit.features.pricingTemplates.list(calculator.snapshot()).then(function (savedTemplates) {
          templates = savedTemplates;
          activeTemplateId = templates.length ? templates[0].id : null;
          templatesReady = true;
          render();
        });
      }

      function render() {
        if (!panel) return;
        const values = calculator.calculate();
        const inputs = calculator.getInputs();
        const overriddenCount = ['internationalFreight', 'pricingFreight', 'totalCost', 'profit', 'suggestedPrice']
          .filter(function (field) { return calculator.isOverridden(field); }).length
          + calculator.discounts.filter(function (discount) {
            return calculator.isOverridden('discount', calculator.discountKey(discount));
          }).length;
        const discountFields = calculator.discounts.map(function (discount) {
          const key = calculator.discountKey(discount);
          return formulaField(
            formatDiscount(discount) + '标价',
            'discount',
            values.discountPrices[key],
            'USD',
            calculator.isOverridden('discount', key),
            key
          );
        }).join('');

        panel.innerHTML = `
          <div class="pc-header">
            <div>
              <h2>定价计算器</h2>
            </div>
            <button class="pc-close" type="button" data-action="close" aria-label="关闭">×</button>
          </div>
          <div class="pc-scroll">
            <p class="pc-description">运费单价、重量、挂号费和运费折扣为手填参数；国际运费是公式结果。带 <span class="pc-auto-label">自动计算</span> 的值可直接修改，修改后会明确标记。</p>
            ${templateSection()}
            ${overriddenCount ? `<div class="pc-modified-notice">当前有 ${overriddenCount} 项使用手动值，不会随输入参数自动更新。<button type="button" data-action="reset-all">恢复全部计算</button></div>` : ''}

            <section class="pc-section">
              <h3>国际运费参数</h3>
              <div class="pc-grid pc-grid-two">
                ${inputField('运费单价', 'shippingRate', inputs.shippingRate, 'CNY/kg')}
                ${inputField('产品重量', 'weight', inputs.weight, 'g')}
                ${inputField('挂号费', 'registrationFee', inputs.registrationFee, 'CNY')}
                ${inputField('运费折扣', 'shippingDiscount', inputs.shippingDiscount, '%')}
              </div>
              ${formulaField('国际运费', 'internationalFreight', values.internationalFreight, 'CNY', calculator.isOverridden('internationalFreight'))}
            </section>

            <section class="pc-section">
              <h3>售价与利润</h3>
              <div class="pc-grid pc-grid-two">
                ${inputField('产品成本', 'cost', inputs.cost, 'CNY')}
                ${inputField('国内运费', 'domesticShipping', inputs.domesticShipping, 'CNY')}
                ${inputField('目标利润率', 'profitMargin', inputs.profitMargin, '%')}
                ${inputField('人民币兑美元', 'exchangeRate', inputs.exchangeRate, 'CNY/USD')}
                ${inputField('平台佣金', 'platformCommission', inputs.platformCommission, '%')}
                ${formulaField('总成本', 'totalCost', values.totalCost, 'CNY', calculator.isOverridden('totalCost'))}
              </div>
              ${formulaField('定价使用的国际运费', 'pricingFreight', values.pricingFreight, 'CNY', calculator.isOverridden('pricingFreight'))}
              ${formulaField('利润', 'profit', values.profit, 'CNY', calculator.isOverridden('profit'))}
              ${formulaField('建议售价', 'suggestedPrice', values.suggestedPrice, 'USD', calculator.isOverridden('suggestedPrice'))}
              ${values.invalidSuggestedPrice && !calculator.isOverridden('suggestedPrice') ? '<p class="pc-validation">汇率需大于 0，且平台佣金必须小于 100%。</p>' : ''}
            </section>

            <section class="pc-section">
              <h3>促销折扣价参考</h3>
              <p class="pc-section-note">根据建议售价 ÷ 折扣计算；每一项也可单独调整。</p>
              <div class="pc-grid pc-grid-two pc-discount-grid">${discountFields}</div>
            </section>
          </div>`;
      }

      function close() {
        if (!panel) return;
        panel.remove();
        panel = null;
      }

      function copyValue(value, button) {
        const copiedMarkup = button.innerHTML;
        const showCopied = function () {
          button.innerHTML = COPIED_ICON;
          button.title = '复制成功';
          button.setAttribute('aria-label', '复制成功');
          setTimeout(function () {
            if (button.isConnected) {
              button.innerHTML = copiedMarkup;
              button.title = '复制数值';
              button.setAttribute('aria-label', '复制数值');
            }
          }, 1200);
        };

        // Keep this synchronous first: execCommand is more reliable in a
        // content-script click handler, where Clipboard API permissions can be
        // denied despite an HTTPS Shopify page.
        if (fallbackCopy(value, showCopied)) return;
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(value).then(showCopied).catch(function () {
            button.title = '复制失败，请重试';
          });
        } else {
          button.title = '复制失败，请重试';
        }
      }

      function fallbackCopy(value, onSuccess) {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          const copied = document.execCommand('copy');
          if (copied) onSuccess();
          return copied;
        } catch (_) {
          return false;
        } finally {
          textarea.remove();
        }
      }

      function open() {
        if (panel) return;
        panel = document.createElement('aside');
        panel.id = 'pricing-calculator-panel';
        panel.setAttribute('aria-label', '速卖通定价计算器');
        document.body.appendChild(panel);
        render();

        panel.addEventListener('change', function (event) {
          const target = event.target;
          if (target instanceof HTMLSelectElement && target.dataset.templateSelect !== undefined) {
            activeTemplateId = target.value || null;
            templateMessage = '';
            render();
          } else if (!(target instanceof HTMLInputElement)) {
            return;
          } else if (target.dataset.input) {
            calculator.setInput(target.dataset.input, target.value);
          } else if (target.dataset.formula) {
            calculator.override(target.dataset.formula, target.value, target.dataset.key);
          } else {
            return;
          }
          render();
        });
        panel.addEventListener('click', function (event) {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const copyButtonTarget = target.closest('[data-copy-value]');
          if (copyButtonTarget instanceof HTMLButtonElement) {
            copyValue(copyButtonTarget.dataset.copyValue, copyButtonTarget);
          } else if (target.dataset.action === 'close') {
            close();
          } else if (target.dataset.action === 'template-load') {
            const template = activeTemplate();
            if (!template) return;
            calculator.load(template.state);
            templateMessage = '已载入“' + template.name + '”';
            render();
          } else if (target.dataset.action === 'template-save-as') {
            const name = window.prompt('请输入新模板名称');
            if (!name || !name.trim()) return;
            const template = {
              id: 'pricing-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
              name: name.trim(),
              state: calculator.snapshot(),
              updatedAt: Date.now()
            };
            templates.push(template);
            activeTemplateId = template.id;
            saveTemplates('已新增“' + template.name + '”');
          } else if (target.dataset.action === 'template-update') {
            const template = activeTemplate();
            if (!template) return;
            const name = window.prompt('模板名称', template.name);
            if (name === null) return;
            template.name = name.trim() || template.name;
            template.state = calculator.snapshot();
            template.updatedAt = Date.now();
            saveTemplates('已更新“' + template.name + '”');
          } else if (target.dataset.action === 'template-delete') {
            const template = activeTemplate();
            if (!template || !window.confirm('确定删除模板“' + template.name + '”吗？')) return;
            templates = templates.filter(function (item) { return item.id !== template.id; });
            activeTemplateId = templates.length ? templates[0].id : null;
            saveTemplates('已删除“' + template.name + '”');
          } else if (target.dataset.action === 'reset-all') {
            calculator.resetAll();
            render();
          } else if (target.dataset.reset) {
            calculator.reset(target.dataset.reset, target.dataset.key);
            render();
          }
        });
        loadTemplateList();
      }

      return { open: open, close: close };
    }
  };
})(window.OperationsToolkit);
