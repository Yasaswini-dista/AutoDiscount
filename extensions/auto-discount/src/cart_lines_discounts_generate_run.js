import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
} from '../generated/api';


/**
  * @typedef {import("../generated/api").CartInput} RunInput
  * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
  */

/**
  * @param {RunInput} input
  * @returns {CartLinesDiscountsGenerateRunResult}
  */

export function cartLinesDiscountsGenerateRun(input) {
  // Defensive: ensure cart.lines exists
  const cartLines = input.cart && Array.isArray(input.cart.lines) ? input.cart.lines : [];
  if (cartLines.length === 0) {
    return { operations: [] };
  }

  const hasOrderDiscountClass = input.discount.discountClasses.includes(DiscountClass.Order);
  const hasProductDiscountClass = input.discount.discountClasses.includes(DiscountClass.Product);
  if (!hasOrderDiscountClass && !hasProductDiscountClass) {
    return { operations: [] };
  }

  // Read function config from metafield (singular)
  let config = {};
  if (input.discount.metafield && input.discount.metafield.value) {
    try {
      config = JSON.parse(input.discount.metafield.value);
    } catch (e) {
      config = {};
    }
  }

  const operations = [];

  // Helper: get eligible cart lines based on appliesTo
  function getEligibleCartLines() {
    if (config.appliesTo === 'all' || !config.appliesTo) {
      return cartLines;
    }
    if (config.appliesTo === 'products' && Array.isArray(config.specificProducts)) {
      return cartLines.filter(line => config.specificProducts.includes(line.merchandise.product.id));
    }
    if (config.appliesTo === 'collections' && Array.isArray(config.specificCollections)) {
      return cartLines.filter(line => {
        if (!line.merchandise.product.collections) return false;
        return line.merchandise.product.collections.some(col => config.specificCollections.includes(col.id));
      });
    }
    return cartLines;
  }

  // Helper: get quantity/amount for per-variant or total
  function getLineQty(line) {
    return line.quantity;
  }
  function getLineAmount(line) {
    return Number(line.cost.subtotalAmount.amount);
  }

  if (Array.isArray(config.tiers)) {
    // New tiered config: each tier can have multiple discount types
    const productCandidates = [];
    const orderCandidates = [];
    for (const tier of config.tiers) {
      // Determine if this tier applies (minQty/minAmount)
      let tierApplies = false;
      let tierValue = 0;
      if (config.minType === 'amount' && tier.minAmount) {
        // Sum all eligible lines for amount
        tierValue = getEligibleCartLines().reduce((sum, line) => sum + getLineAmount(line), 0);
        tierApplies = tierValue >= Number(tier.minAmount);
      } else if (tier.minQty) {
        // Sum all eligible lines for quantity
        tierValue = getEligibleCartLines().reduce((sum, line) => sum + getLineQty(line), 0);
        tierApplies = tierValue >= Number(tier.minQty);
      }
      if (!tierApplies) continue;

      // For each discount in this tier
      for (const disc of tier.discounts || []) {
        if (disc.type === 'product' && hasProductDiscountClass) {
          // Product discount: apply to eligible lines
          const eligibleLines = getEligibleCartLines();
          for (const line of eligibleLines) {
            let valueObj = {};
            if (disc.discountType === 'amount') {
              valueObj = { fixedAmount: { amount: Number(disc.value) } };
            } else {
              valueObj = { percentage: { value: Number(disc.value) } };
            }
            productCandidates.push({
              message: `${disc.value}${disc.discountType === 'percentage' ? '%':'$'} OFF PRODUCT`,
              targets: [{ cartLine: { id: line.id } }],
              value: valueObj,
            });
          }
        }
        if (disc.type === 'order' && hasOrderDiscountClass) {
          // Order discount: apply to order subtotal
          let valueObj = {};
          if (disc.discountType === 'amount') {
            valueObj = { fixedAmount: { amount: Number(disc.value) } };
          } else {
            valueObj = { percentage: { value: Number(disc.value) } };
          }
          orderCandidates.push({
            message: `${disc.value}${disc.discountType === 'percentage' ? '%':'$'} OFF ORDER`,
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: [],
                },
              },
            ],
            value: valueObj,
          });
        }
        // Gift logic can be added here if needed (e.g., add free product to cart)
      }
    }
    if (productCandidates.length > 0) {
      operations.push({
        productDiscountsAdd: {
          candidates: productCandidates,
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      });
    }
    if (orderCandidates.length > 0) {
      operations.push({
        orderDiscountsAdd: {
          candidates: orderCandidates,
          selectionStrategy: OrderDiscountSelectionStrategy.First,
        },
      });
    }
  } else if (Array.isArray(config.discountValues)) {
    // --- Legacy Volume Discount Logic ---
    // (Original logic for backward compatibility)
    // Find best tier for a given value (qty or amount)
    function findBestTier(value) {
      // Sort tiers descending by minQty/minAmount
      const tiers = [...config.discountValues].sort((a, b) => {
        const aVal = a.minQty || a.minAmount || 0;
        const bVal = b.minQty || b.minAmount || 0;
        return bVal - aVal;
      });
      return tiers.find(tier => {
        if (config.minType === 'amount') {
          return value >= Number(tier.minAmount || 0);
        } else {
          return value >= Number(tier.minQty || 0);
        }
      });
    }

    // --- Product Discount ---
    if (hasProductDiscountClass) {
      const eligibleLines = getEligibleCartLines();
      const candidates = [];
      if (config.minPerVariant) {
        // Each variant must meet min separately
        for (const line of eligibleLines) {
          const value = config.minType === 'amount' ? getLineAmount(line) : getLineQty(line);
          const tier = findBestTier(value);
          if (tier && tier.value) {
            let candidate = {
              message: `${tier.value}${tier.type === 'percentage' ? '%':'$'} OFF PRODUCT`,
              targets: [{ cartLine: { id: line.id } }],
              value: {},
            };
            if (tier.type === 'amount') {
              candidate.value = { fixedAmount: { amount: Number(tier.value) } };
            } else {
              candidate.value = { percentage: { value: Number(tier.value) } };
            }
            candidates.push(candidate);
          }
        }
      } else {
        // Sum all eligible lines for total
        let totalValue = 0;
        if (config.minType === 'amount') {
          totalValue = eligibleLines.reduce((sum, line) => sum + getLineAmount(line), 0);
        } else {
          totalValue = eligibleLines.reduce((sum, line) => sum + getLineQty(line), 0);
        }
        const tier = findBestTier(totalValue);
        if (tier && tier.value) {
          for (const line of eligibleLines) {
            let candidate = {
              message: `${tier.value}${tier.type === 'percentage' ? '%':'$'} OFF PRODUCT`,
              targets: [{ cartLine: { id: line.id } }],
              value: {},
            };
            if (tier.type === 'amount') {
              candidate.value = { fixedAmount: { amount: Number(tier.value) } };
            } else {
              candidate.value = { percentage: { value: Number(tier.value) } };
            }
            candidates.push(candidate);
          }
        }
      }
      if (candidates.length > 0) {
        operations.push({
          productDiscountsAdd: {
            candidates,
            selectionStrategy: ProductDiscountSelectionStrategy.First,
          },
        });
      }
    }

    // --- Order Discount (optional, if combos.order) ---
    if (hasOrderDiscountClass) {
      // For order discount, use the best tier based on total cart value/qty
      let totalValue = 0;
      if (config.minType === 'amount') {
        totalValue = cartLines.reduce((sum, line) => sum + getLineAmount(line), 0);
      } else {
        totalValue = cartLines.reduce((sum, line) => sum + getLineQty(line), 0);
      }
      const tier = findBestTier(totalValue);
      if (tier && tier.value) {
        let valueObj = {};
        if (tier.type === 'amount') {
          valueObj = { fixedAmount: { amount: Number(tier.value) } };
        } else {
          valueObj = { percentage: { value: Number(tier.value) } };
        }
        operations.push({
          orderDiscountsAdd: {
            candidates: [
              {
                message: `${tier.value}${tier.type === 'percentage' ? '%':'$'} OFF ORDER`,
                targets: [
                  {
                    orderSubtotal: {
                      excludedCartLineIds: [],
                    },
                  },
                ],
                value: valueObj,
              },
            ],
            selectionStrategy: OrderDiscountSelectionStrategy.First,
          },
        });
      }
    }
  }

  return {
    operations,
  };
}