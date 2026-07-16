/**
 * AliExpress pricing rules, transcribed from the supplied workbook.
 * Formula fields support an explicit local override so a manual adjustment is
 * never confused with an automatically calculated value.
 */
(function registerPricingFormula(toolkit) {
  'use strict';

  const DISCOUNTS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5,
    0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];

  function roundCurrency(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function discountKey(discount) {
    return String(Math.round(discount * 100));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createCalculator() {
    const inputs = {
      shippingRate: 100,
      weight: 200,
      registrationFee: 20,
      shippingDiscount: 100,
      cost: 0,
      domesticShipping: 0,
      profitMargin: 30,
      exchangeRate: 6,
      platformCommission: 5
    };
    const overrides = {
      internationalFreight: null,
      pricingFreight: null,
      totalCost: null,
      profit: null,
      suggestedPrice: null,
      discounts: Object.create(null)
    };

    function calculate() {
      // Excel: ROUND((运费单价 * 重量 * 0.001 + 挂号费) * 运费折扣, 2)
      const autoInternationalFreight = roundCurrency(
        (toNumber(inputs.shippingRate) * toNumber(inputs.weight) * 0.001
          + toNumber(inputs.registrationFee))
          * (toNumber(inputs.shippingDiscount) / 100)
      );
      const internationalFreight = overrides.internationalFreight === null
        ? autoInternationalFreight
        : overrides.internationalFreight;
      const pricingFreight = overrides.pricingFreight === null
        ? internationalFreight
        : overrides.pricingFreight;
      const autoTotalCost = roundCurrency(
        toNumber(inputs.cost) + toNumber(inputs.domesticShipping) + pricingFreight
      );
      const totalCost = overrides.totalCost === null ? autoTotalCost : overrides.totalCost;
      const autoProfit = roundCurrency(totalCost * (toNumber(inputs.profitMargin) / 100));
      const profit = overrides.profit === null ? autoProfit : overrides.profit;
      const denominator = toNumber(inputs.exchangeRate)
        * (1 - toNumber(inputs.platformCommission) / 100);
      const autoSuggestedPrice = denominator > 0
        ? roundCurrency(totalCost * (1 + toNumber(inputs.profitMargin) / 100) / denominator)
        : null;
      const suggestedPrice = overrides.suggestedPrice === null
        ? autoSuggestedPrice
        : overrides.suggestedPrice;
      const discountPrices = {};

      DISCOUNTS.forEach(function (discount) {
        const key = discountKey(discount);
        discountPrices[key] = overrides.discounts[key] === undefined
          ? (suggestedPrice === null ? null : roundCurrency(suggestedPrice / discount))
          : overrides.discounts[key];
      });

      return {
        internationalFreight: internationalFreight,
        pricingFreight: pricingFreight,
        totalCost: totalCost,
        profit: profit,
        suggestedPrice: suggestedPrice,
        discountPrices: discountPrices,
        invalidSuggestedPrice: autoSuggestedPrice === null
      };
    }

    return {
      discounts: DISCOUNTS.slice(),
      getInputs: function () {
        return Object.assign({}, inputs);
      },
      snapshot: function () {
        return clone({ inputs: inputs, overrides: overrides });
      },
      load: function (snapshot) {
        const savedInputs = snapshot && snapshot.inputs;
        const savedOverrides = snapshot && snapshot.overrides;
        if (savedInputs && typeof savedInputs === 'object') {
          Object.keys(inputs).forEach(function (field) {
            if (Object.prototype.hasOwnProperty.call(savedInputs, field)) {
              inputs[field] = toNumber(savedInputs[field]);
            }
          });
        }
        overrides.internationalFreight = savedOverrides && savedOverrides.internationalFreight !== null
          && savedOverrides.internationalFreight !== undefined
          ? toNumber(savedOverrides.internationalFreight) : null;
        overrides.pricingFreight = savedOverrides && savedOverrides.pricingFreight !== null
          && savedOverrides.pricingFreight !== undefined
          ? toNumber(savedOverrides.pricingFreight) : null;
        overrides.totalCost = savedOverrides && savedOverrides.totalCost !== null
          && savedOverrides.totalCost !== undefined
          ? toNumber(savedOverrides.totalCost) : null;
        overrides.profit = savedOverrides && savedOverrides.profit !== null
          && savedOverrides.profit !== undefined
          ? toNumber(savedOverrides.profit) : null;
        overrides.suggestedPrice = savedOverrides && savedOverrides.suggestedPrice !== null
          && savedOverrides.suggestedPrice !== undefined
          ? toNumber(savedOverrides.suggestedPrice) : null;
        overrides.discounts = Object.create(null);
        if (savedOverrides && savedOverrides.discounts && typeof savedOverrides.discounts === 'object') {
          Object.keys(savedOverrides.discounts).forEach(function (key) {
            overrides.discounts[key] = toNumber(savedOverrides.discounts[key]);
          });
        }
      },
      calculate: calculate,
      isOverridden: function (field, key) {
        if (field === 'discount') return overrides.discounts[key] !== undefined;
        return overrides[field] !== null;
      },
      setInput: function (field, value) {
        inputs[field] = toNumber(value);
      },
      override: function (field, value, key) {
        const number = toNumber(value);
        if (field === 'discount') {
          overrides.discounts[key] = number;
        } else {
          overrides[field] = number;
        }
      },
      reset: function (field, key) {
        if (field === 'discount') {
          delete overrides.discounts[key];
        } else {
          overrides[field] = null;
        }
      },
      resetAll: function () {
        overrides.internationalFreight = null;
        overrides.pricingFreight = null;
        overrides.totalCost = null;
        overrides.profit = null;
        overrides.suggestedPrice = null;
        overrides.discounts = Object.create(null);
      },
      discountKey: discountKey
    };
  }

  toolkit.features.pricingFormula = { create: createCalculator };
})(window.OperationsToolkit);
