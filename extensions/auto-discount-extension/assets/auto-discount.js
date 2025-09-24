// assets/auto-discount.js

// Currency formatting utility (from your other app)
window.CurrencyUtils = {
  formatMoneyCurrency(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = format || window.money_format || "${{amount}}";
    const match = formatString.match(placeholderRegex);
    if (!match) {
      // fallback to a default format if no placeholder is found
      return (parseFloat(cents) / 100).toFixed(2);
    }
    function defaultOption(opt, def) {
      return (typeof opt === 'undefined' ? def : opt);
    }
    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = defaultOption(precision, 2);
      thousands = defaultOption(thousands, ',');
      decimal = defaultOption(decimal, '.');
      if (isNaN(number) || number == null) return 0;
      number = (number / 100.0).toFixed(precision);
      const parts = number.split('.');
      const dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`);
      const cents = parts[1] ? (decimal + parts[1]) : '';
      return dollars + cents;
    }
    switch(match[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
    }
    return formatString.replace(placeholderRegex, value);
  },
};

(async function () {
  // Get the JSON schema from the injected metafield variable
  const data = window.AUTO_DISCOUNT_SCHEMA;
  if (!data || !data.schema) {
    console.error('[AutooDiscount] No schema found in metafield!');
    return;
  }
  const schema = data.schema;


  // Helper to extract product data from a DOM element using selectors from schema config
  function getProductDataFromElement(el, cfg) {
    let price = 0;
    let compare_at_price = undefined;
    // Use sale_selector and compare_at_selector from schema if provided
    if (cfg.sale_selector) {
      const saleEl = el.querySelector(cfg.sale_selector);
      if (saleEl) price = parsePriceText(saleEl.textContent);
    } else {
      // Fallback: first .jsPrice not .card__price--old
      const saleEl = el.querySelector('.jsPrice:not(.card__price--old)');
      if (saleEl) price = parsePriceText(saleEl.textContent);
    }
    if (cfg.compare_at_selector) {
      const compareEl = el.querySelector(cfg.compare_at_selector);
      if (compareEl) compare_at_price = parsePriceText(compareEl.textContent);
    } else {
      // Fallback: .card__price--old.jsPrice
      const compareEl = el.querySelector('.card__price--old.jsPrice');
      if (compareEl) compare_at_price = parsePriceText(compareEl.textContent);
    }
    return { price, compare_at_price };
  }

  function parsePriceText(text) {
    if (!text) return undefined;
    // Remove commas, extract the first valid number (with optional decimal)
    const match = text.replace(/,/g, '').match(/([0-9]+(\.[0-9]+)?)/);
    if (!match) return undefined;
    const num = parseFloat(match[1]);
    if (isNaN(num)) return undefined;
    const result = Math.round(num * 100);
    console.log('[AutoDiscount] parsePriceText:', {raw: text, extracted: match[1], result});
    return result;
  }

  // Replace Liquid variables in HTML with real values, using store's currency format
  function renderHtml(html, product) {
    const moneyFormat = window.money_format || "${{amount}}";
    // Replace placeholders for selected_variant (theme-agnostic)
    let rendered = html.replace(/{{\s*selected_variant\.final_price\s*}}/g, window.CurrencyUtils.formatMoneyCurrency(product.price, moneyFormat));
    if (product.compare_at_price) {
      rendered = rendered.replace(/{{\s*selected_variant\.compare_at_price\s*}}/g, window.CurrencyUtils.formatMoneyCurrency(product.compare_at_price, moneyFormat));
    } else {
      rendered = rendered.replace(/{{\s*selected_variant\.compare_at_price\s*}}/g, '');
    }
    return rendered;
  }

  // Apply schema for a given context
  function applySchema(context) {
    const contextSchema = schema[context] || {};
    Object.values(contextSchema).forEach(cfg => {
      const els = document.querySelectorAll(cfg.selector);
      els.forEach(el => {
        // Extract product data using dynamic selectors from cfg
        const product = getProductDataFromElement(el, cfg);
        const rendered = renderHtml(cfg.html, product);
        // Always replace only the selector's innerHTML
        el.innerHTML = rendered;
      });
    });
  }

  // Always apply "all" context
  applySchema('all');

  // Optionally, apply page-specific context (e.g., "product" if on product page)
  if (window.location.pathname.match(/\/products\//)) {
    applySchema('product');
  }
})();