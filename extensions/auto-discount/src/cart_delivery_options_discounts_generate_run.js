import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
} from "../generated/api";

/**
  * @typedef {import("../generated/api").DeliveryInput} RunInput
  * @typedef {import("../generated/api").CartDeliveryOptionsDiscountsGenerateRunResult} CartDeliveryOptionsDiscountsGenerateRunResult
  */

/**
  * @param {RunInput} input
  * @returns {CartDeliveryOptionsDiscountsGenerateRunResult}
  */

export function cartDeliveryOptionsDiscountsGenerateRun(input) {
  const deliveryGroups = input.cart && Array.isArray(input.cart.deliveryGroups) ? input.cart.deliveryGroups : [];
  if (deliveryGroups.length === 0) {
    return { operations: [] };
  }

  const hasShippingDiscountClass = input.discount.discountClasses.includes(DiscountClass.Shipping);
  if (!hasShippingDiscountClass) {
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

  // --- Tiered Shipping Discount Logic ---
  if (Array.isArray(config.tiers)) {
    for (const tier of config.tiers) {
      // Determine if this tier applies (minQty/minAmount)
      let tierApplies = false;
      let tierValue = 0;
      if (config.minType === 'amount' && tier.minAmount) {
        // No cart lines in delivery input, so skip amount-based for now
        tierApplies = true; // Always apply if minAmount set (or add logic if needed)
      } else if (tier.minQty) {
        tierApplies = true; // Always apply if minQty set (or add logic if needed)
      }
      if (!tierApplies) continue;

      for (const disc of tier.discounts || []) {
        if (disc.type === 'shipping') {
          // Shipping discount: apply to all delivery groups
          for (const group of deliveryGroups) {
            let valueObj = {};
            if (disc.discountType === 'amount') {
              valueObj = { fixedAmount: { amount: Number(disc.value) } };
            } else {
              valueObj = { percentage: { value: Number(disc.value) } };
            }
            operations.push({
              deliveryDiscountsAdd: {
                candidates: [
                  {
                    message: disc.value == 100 ? 'FREE DELIVERY' : `${disc.value}${disc.discountType === 'percentage' ? '%' : '$'} OFF SHIPPING`,
                    targets: [
                      {
                        deliveryGroup: {
                          id: group.id,
                        },
                      },
                    ],
                    value: valueObj,
                  },
                ],
                selectionStrategy: DeliveryDiscountSelectionStrategy.All,
              },
            });
          }
        }
      }
    }
  } else {
    // --- Legacy logic: always apply free shipping if shipping class present ---
    for (const group of deliveryGroups) {
      operations.push({
        deliveryDiscountsAdd: {
          candidates: [
            {
              message: 'FREE DELIVERY',
              targets: [
                {
                  deliveryGroup: {
                    id: group.id,
                  },
                },
              ],
              value: {
                percentage: {
                  value: 100,
                },
              },
            },
          ],
          selectionStrategy: DeliveryDiscountSelectionStrategy.All,
        },
      });
    }
  }

  return { operations };
}