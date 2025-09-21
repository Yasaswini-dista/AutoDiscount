import { useState } from "react";
import * as Polaris from "@shopify/polaris";
import * as Flags from 'country-flag-icons/react/3x2';


import { useFetcher } from "@remix-run/react";
const {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  Button,
  Checkbox,
  InlineStack,
  BlockStack,
  Box,
  Text,
  Icon,
  RadioButton,
  Divider,
} = Polaris;

// Helper for default date string (YYYY-MM-DD)
function getDefaultDateString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
// Helper for default start time (hh:mm AM/PM)
function getDefaultStartTime12() {
  const d = new Date();
  let h = d.getHours();
  let m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function TierDiscount({ onBack, initialStartTime, segments = [], error, shopDomain, countries = [], parentAction }) {
  const fetcher = useFetcher();
  // Handler for Save button
  const handleSave = () => {
    const payload = {
      shippingOptions,
      specificProducts,
      specificCollections,
      discountMethod,
      discountCode,
      autoTitle,
      minType,
      amount,
      minQty,
      appliesTo,
      purchaseType,
      eligibility,
      selectedSegments,
      combos,
      maxUses,
      maxUsesPerCustomer,
      startDate,
      startTime,
      hasEndDate,
      endDate,
      endTime,
      tiers,
    };
    const formData = new FormData();
    formData.append("discountType", "tier");
    formData.append("payload", JSON.stringify(payload));
    formData.append("intent", "tier-discount");
    fetcher.submit(formData, { method: "post", action: parentAction });
  };

  // Per-discount state for shipping discount UI
  // Use dynamic countries prop and map to flag components
  const [shippingOptions, setShippingOptions] = useState({}); // { [tierIdx_discIdx]: { exclude: false, amount: "0.00", appliesTo: "all" | "specific", countrySearch: '', selectedCountries: [] } }
  // State for specific products/collections (resource picker logic)
  const [specificProducts, setSpecificProducts] = useState([]);
  const [specificCollections, setSpecificCollections] = useState([]);
  // Error/empty state
  if (error) {
    return (
      <Page title="Create multi-class tier discount">
        <Card sectioned>
          <Text color="critical">Error: {error}</Text>
        </Card>
      </Page>
    );
  }
    // Build countryList from countries prop, mapping code to SVG Flag
    const countryList = (Array.isArray(countries) ? countries : []).map((c) => ({
      ...c,
      Flag: Flags[c.code] || null,
    }));
  if (!segments || segments.length === 0) {
    return (
      <Page title="Create multi-class tier discount">
        <Card sectioned>
          <Text>No customer segments found. Please create segments in Shopify admin.</Text>
        </Card>
      </Page>
    );
  }

  // Form state
  const [discountMethod, setDiscountMethod] = useState("code"); // "code" or "automatic"
  const [discountCode, setDiscountCode] = useState("");
  const [autoTitle, setAutoTitle] = useState("");
  const [minType, setMinType] = useState("amount");
  const [amount, setAmount] = useState("");
  const [minQty, setMinQty] = useState("1");
  const [appliesTo, setAppliesTo] = useState("all");
  const [purchaseType, setPurchaseType] = useState("one-time");
  const [eligibility, setEligibility] = useState("all");
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [segmentSearch, setSegmentSearch] = useState("");
  const [segmentOptions, setSegmentOptions] = useState(segments || []);
  const [combos, setCombos] = useState({ product: false, order: false, shipping: false });
  const [maxUses, setMaxUses] = useState(false);
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState(false);
  const [startDate, setStartDate] = useState(getDefaultDateString());
  const [startTime, setStartTime] = useState(initialStartTime || getDefaultStartTime12());
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState(getDefaultDateString());
  const [endTime, setEndTime] = useState("");

  // Tiers state
  const [tiers, setTiers] = useState([
    {
      id: 1,
      minAmount: "",
      minQty: "",
      discounts: [], // No default discount field
    },
  ]);

  // Handlers for tiers and discounts
  const handleAddTier = () => {
    setTiers([
      ...tiers,
      {
        id: tiers.length + 1,
        minAmount: "",
        minQty: "",
        discounts: [], // No default discount field
      },
    ]);
  };
  const handleRemoveTier = (idx) => {
    if (tiers.length === 1) return;
    setTiers(tiers.filter((_, i) => i !== idx));
  };
  // Discount types for popover menu
  const discountMenuOptions = [
    {
      key: "product",
      label: "Product discount",
      description: "Discount specific products or collections",
      icon: "ProductsMajor",
      type: "product",
    },
    {
      key: "order",
      label: "Order discount",
      description: "Discount the total order amount",
      icon: "OrderMajor",
      type: "order",
    },
    {
      key: "gift",
      label: "Free gift with purchase",
      description: "Automatically add free gift to cart",
      icon: "GiftCardMajor",
      type: "gift",
    },
    {
      key: "shipping",
      label: "Free shipping",
      description: "Offer free shipping on an order",
      icon: "TruckMajor",
      type: "shipping",
    },
  ];
  // Popover state for each tier
  const [discountPopover, setDiscountPopover] = useState({ open: false, tierIdx: null });
  const handleOpenDiscountPopover = (tierIdx) => setDiscountPopover({ open: true, tierIdx });
  const handleCloseDiscountPopover = () => setDiscountPopover({ open: false, tierIdx: null });
  // Add discount of selected type to tier
  const handleAddDiscountType = (tierIdx, type) => {
    setTiers(
      tiers.map((tier, i) =>
        i === tierIdx
          ? {
              ...tier,
              discounts: [
                ...tier.discounts,
                {
                  id: tier.discounts.length + 1,
                  type,
                  value: "",
                  ...(type === "order" ? { discountType: "percentage" } : {}),
                },
              ],
            }
          : tier
      )
    );
    handleCloseDiscountPopover();
  };
// Removed duplicate handler declarations for handleRemoveDiscount, handleTierField, handleDiscountField, handleSegmentToggle
  function handleSetEndDate(checked) {
    setHasEndDate(checked);
    if (checked && !endTime) setEndTime("11:59 PM");
  }
// Removed duplicate and misplaced code block that caused syntax errors
  const handleRemoveDiscount = (tierIdx, discIdx) => {
    setTiers(
      tiers.map((tier, i) =>
        i === tierIdx
          ? {
              ...tier,
              discounts: tier.discounts.filter((_, j) => j !== discIdx),
            }
          : tier
      )
    );
  };
  const handleTierField = (idx, field, val) => {
    setTiers(
      tiers.map((tier, i) =>
        i === idx ? { ...tier, [field]: val } : tier
      )
    );
  };
  const handleDiscountField = (tierIdx, discIdx, field, val) => {
    setTiers(
      tiers.map((tier, i) =>
        i === tierIdx
          ? {
              ...tier,
              discounts: tier.discounts.map((d, j) =>
                j === discIdx ? { ...d, [field]: val } : d
              ),
            }
          : tier
      )
    );
  };
  const handleSegmentToggle = () => setShowSegmentModal((v) => !v);
  function handleSetEndDate(checked) {
    setHasEndDate(checked);
    if (checked && !endTime) setEndTime("11:59 PM");
  }

  // Main return block
  return (
    <Page title="Create multi-class tier discount" backAction={{ content: "Discounts", onAction: onBack }}>
      <Layout>
        <Layout.Section>
          <BlockStack gap="loose">
            {/* Main Card - Discount code/automatic toggle and input */}
            <Card>
              <BlockStack gap="loose">
                <InlineStack align="space-between">
                  <Text variant="headingMd">Multi-class tier discount</Text>
                  <Text>Multi-effect discount</Text>
                </InlineStack>
                <InlineStack gap="loose">
                  <Button
                    pressed={discountMethod === "code"}
                    onClick={() => setDiscountMethod("code")}
                  >
                    Discount code
                  </Button>
                  <Button
                    pressed={discountMethod === "automatic"}
                    onClick={() => setDiscountMethod("automatic")}
                  >
                    Automatic discount
                  </Button>
                </InlineStack>
                {discountMethod === "automatic" && (
                  <TextField
                    label="Automatic discount title"
                    value={autoTitle}
                    onChange={setAutoTitle}
                    maxLength={64}
                    helpText="Enter a title for this automatic discount. Customers will see this at checkout."
                  />
                )}
                {discountMethod === "code" && (
                  <>
                    <TextField
                      label="Discount code"
                      value={discountCode}
                      onChange={setDiscountCode}
                      maxLength={64}
                      helpText="Create a URL-friendly discount code that avoids special characters. Customers will see this code in their cart and checkout."
                    />
                  </>
                )}
              </BlockStack>
            </Card>

            {/* Minimum purchase requirements */}
            <Card>
              <BlockStack gap="loose">
                <Text variant="headingSm">Minimum purchase requirements</Text>
                <BlockStack gap="tight">
                  <RadioButton
                    label="Minimum purchase amount"
                    checked={minType === "amount"}
                    onChange={() => setMinType("amount")}
                    name="minType"
                  />
                  <RadioButton
                    label="Minimum quantity of items"
                    checked={minType === "quantity"}
                    onChange={() => setMinType("quantity")}
                    name="minType"
                  />
                </BlockStack>
                <InlineStack gap="300" wrap>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Select
                      label="Applies to"
                      options={[
                        { label: "All products", value: "all" },
                        { label: "Specific products", value: "products" },
                        { label: "Specific collections", value: "collections" },
                      ]}
                      value={appliesTo}
                      onChange={setAppliesTo}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Select
                      label="Purchase type"
                      options={[
                        { label: "One-time purchase", value: "one-time" },
                        { label: "Subscription", value: "subscription" },
                      ]}
                      value={purchaseType}
                      onChange={setPurchaseType}
                    />
                  </div>
                </InlineStack>
                    {/* Resource picker for specific products */}
                    {appliesTo === "products" && (
                      <Box marginBlockStart="4">
                        <Box display="flex" alignItems="center" gap="200" marginBlockStart="2">
                          <TextField
                            value={specificProducts.map(p => p.title).join(", ")}
                            onChange={() => {}}
                            placeholder="Search products"
                            autoComplete="off"
                            fullWidth
                          />
                          <Box minWidth="100px" marginBlockStart="5">
                            <Button
                              onClick={async () => {
                                if (typeof window.shopify?.resourcePicker !== 'function') {
                                  alert('Shopify resourcePicker API is not available. Make sure your app is embedded in Shopify admin.');
                                  return;
                                }
                                try {
                                  const selected = await window.shopify.resourcePicker({
                                    type: 'product',
                                    multiple: true,
                                    title: 'Select product',
                                    selectButtonText: 'Select'
                                  });
                                  if (selected && selected.length > 0) {
                                    setSpecificProducts(selected);
                                  }
                                } catch (e) {
                                  // User cancelled or error
                                }
                              }}
                            >
                              Browse
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                    )}
                    {/* Resource picker for specific collections */}
                    {appliesTo === "collections" && (
                      <Box marginBlockStart="4">
                        <Box display="flex" alignItems="center" gap="200" marginBlockStart="2">
                          <TextField
                            value={specificCollections.map(c => c.title).join(", ")}
                            onChange={() => {}}
                            placeholder="Search collections"
                            autoComplete="off"
                            fullWidth
                          />
                          <Box minWidth="100px" marginBlockStart="5">
                            <Button
                              onClick={async () => {
                                if (typeof window.shopify?.resourcePicker !== 'function') {
                                  alert('Shopify resourcePicker API is not available. Make sure your app is embedded in Shopify admin.');
                                  return;
                                }
                                try {
                                  const selected = await window.shopify.resourcePicker({
                                    type: 'collection',
                                    multiple: true,
                                    title: 'Select collection',
                                    selectButtonText: 'Select'
                                  });
                                  if (selected && selected.length > 0) {
                                    setSpecificCollections(selected);
                                  }
                                } catch (e) {
                                  // User cancelled or error
                                }
                              }}
                            >
                              Browse
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                    )}
                {/* Removed per-variant minimum checkbox and explanation as per new UI */}
              </BlockStack>
            </Card>

            {/* Tiers */}
            <Card>
              <BlockStack gap="loose">
                <Text variant="headingSm">Tiers</Text>
                <Text color="subdued" as="span">
                  Discounts from each tier will carry over unless a greater discount is applied to the line item.
                </Text>
                {tiers.map((tier, i) => (
                  <Box key={tier.id} background="bg-surface-secondary" padding="400" borderRadius="200" marginBlockEnd="400">
                    <BlockStack gap="loose">
                      <Text variant="headingSm">Tier {i + 1}</Text>
                      {minType === "amount" ? (
                        <TextField
                          label="Minimum purchase amount"
                          prefix="₹"
                          value={tier.minAmount}
                          onChange={(val) => handleTierField(i, "minAmount", val)}
                        />
                      ) : (
                        <TextField
                          label="Minimum quantity of items"
                          value={tier.minQty}
                          onChange={(val) => handleTierField(i, "minQty", val)}
                        />
                      )}
                      {/* Discounts in this tier */}
                      {tier.discounts.map((disc, j) => {
                        if (disc.type === "product") {
                          // UI for Product discount (matches screenshot)
                          const selectedProducts = Array.isArray(disc.selectedProducts) ? disc.selectedProducts : [];
                          const selectedCollections = Array.isArray(disc.selectedCollections) ? disc.selectedCollections : [];
                          return (
                            <Box key={disc.id} background="bg-surface" borderRadius="200" padding="400" marginBlockStart="400" marginBlockEnd="400">
                              <BlockStack gap="loose">
                                <Box display="flex" alignItems="center" gap="200">
                                  <Icon source="ProductsMajor" color="base" />
                                  <Text variant="headingSm">Product discount</Text>
                                </Box>
                                <Divider />
                                <Text variant="bodyMd" fontWeight="medium">Discount value</Text>
                                <InlineStack>
                                  <Select
                                    options={[
                                      { label: "Percentage", value: "percentage" },
                                      { label: "Fixed amount", value: "amount" },
                                    ]}
                                    value={disc.discountType || "percentage"}
                                    onChange={val => handleDiscountField(i, j, "discountType", val)}
                                    style={{ minWidth: 140 }}
                                  />
                                  <TextField
                                    prefix={disc.discountType === "amount" ? "₹" : undefined}
                                    suffix={disc.discountType === "percentage" || !disc.discountType ? "%" : undefined}
                                    value={disc.value}
                                    onChange={val => handleDiscountField(i, j, "value", val)}
                                    style={{ minWidth: 120 }}
                                  />
                                </InlineStack>
                                <Box marginBlockStart="200">
                                  <Select
                                    label="Applies to"
                                    options={[
                                      { label: "All products", value: "all" },
                                      { label: "Specific products", value: "products" },
                                      { label: "Specific collections", value: "collections" },
                                    ]}
                                    value={disc.appliesTo || "all"}
                                    onChange={val => handleDiscountField(i, j, "appliesTo", val)}
                                  />
                                </Box>
                                {/* Resource picker for specific products */}
                                {disc.appliesTo === "products" && (
                                  <Box marginBlockStart="200">
                                    <Box display="flex" alignItems="center" gap="200">
                                      <TextField
                                        value={selectedProducts.map(p => p.title).join(", ")}
                                        onChange={() => {}}
                                        placeholder="Search products"
                                        autoComplete="off"
                                        fullWidth
                                      />
                                      <Box minWidth="100px">
                                        <Button
                                          onClick={async () => {
                                            if (typeof window.shopify?.resourcePicker !== 'function') {
                                              alert('Shopify resourcePicker API is not available. Make sure your app is embedded in Shopify admin.');
                                              return;
                                            }
                                            try {
                                              const selected = await window.shopify.resourcePicker({
                                                type: 'product',
                                                multiple: true,
                                                title: 'Select product',
                                                selectButtonText: 'Select'
                                              });
                                              if (selected && selected.length > 0) {
                                                handleDiscountField(i, j, "selectedProducts", selected);
                                              }
                                            } catch (e) {
                                              // User cancelled or error
                                            }
                                          }}
                                        >
                                          Browse
                                        </Button>
                                      </Box>
                                    </Box>
                                  </Box>
                                )}
                                {/* Resource picker for specific collections */}
                                {disc.appliesTo === "collections" && (
                                  <Box marginBlockStart="200">
                                    <Box display="flex" alignItems="center" gap="200">
                                      <TextField
                                        value={selectedCollections.map(c => c.title).join(", ")}
                                        onChange={() => {}}
                                        placeholder="Search collections"
                                        autoComplete="off"
                                        fullWidth
                                      />
                                      <Box minWidth="100px">
                                        <Button
                                          onClick={async () => {
                                            if (typeof window.shopify?.resourcePicker !== 'function') {
                                              alert('Shopify resourcePicker API is not available. Make sure your app is embedded in Shopify admin.');
                                              return;
                                            }
                                            try {
                                              const selected = await window.shopify.resourcePicker({
                                                type: 'collection',
                                                multiple: true,
                                                title: 'Select collection',
                                                selectButtonText: 'Select'
                                              });
                                              if (selected && selected.length > 0) {
                                                handleDiscountField(i, j, "selectedCollections", selected);
                                              }
                                            } catch (e) {
                                              // User cancelled or error
                                            }
                                          }}
                                        >
                                          Browse
                                        </Button>
                                      </Box>
                                    </Box>
                                  </Box>
                                )}
                                <Box display="flex" justifyContent="space-between" marginBlockStart="400">
                                  <Button destructive onClick={() => handleRemoveDiscount(i, j)}>Delete</Button>
                                  <Button primary>Done</Button>
                                </Box>
                              </BlockStack>
                            </Box>
                          );
                        }
                        if (disc.type === "order") {
                          return (
                            <Box key={disc.id} background="bg-surface" borderRadius="200" padding="400" marginBlockStart="400" marginBlockEnd="400">
                              <BlockStack gap="loose">
                                <Box display="flex" alignItems="center" gap="200">
                                  <Icon source="OrderMajor" color="base" />
                                  <Text variant="headingSm">Order discount</Text>
                                </Box>
                                <Divider />
                                <Text variant="bodyMd" fontWeight="medium">Discount value</Text>
                                <InlineStack>
                                  <Select
                                    options={[
                                      { label: "Percentage", value: "percentage" },
                                      { label: "Fixed amount", value: "amount" },
                                    ]}
                                    value={disc.discountType || "amount"}
                                    onChange={val => handleDiscountField(i, j, "discountType", val)}
                                    style={{ minWidth: 140 }}
                                  />
                                  <TextField
                                    prefix={disc.discountType === "amount" || !disc.discountType ? "₹" : undefined}
                                    suffix={disc.discountType === "percentage" ? "%" : undefined}
                                    value={disc.value}
                                    onChange={val => handleDiscountField(i, j, "value", val)}
                                    style={{ minWidth: 120 }}
                                  />
                                </InlineStack>
                                <Box display="flex" justifyContent="space-between" marginBlockStart="400">
                                  <Button destructive onClick={() => handleRemoveDiscount(i, j)}>Delete</Button>
                                  <Button primary>Done</Button>
                                </Box>
                              </BlockStack>
                            </Box>
                          );
                        }
                        if (disc.type === "gift") {
                          return (
                            <Box key={disc.id} background="bg-surface" borderRadius="200" padding="400" marginBlockStart="400" marginBlockEnd="400">
                              <BlockStack gap="loose">
                                <Box display="flex" alignItems="center" gap="200">
                                  <Icon source="GiftCardMajor" color="base" />
                                  <Text variant="headingSm">Free gift with purchase</Text>
                                </Box>
                                <Text>Customer gets free gift</Text>
                                <Box display="flex" alignItems="center" gap="200">
                                  <TextField
                                    value={disc.selectedProduct ? disc.selectedProduct.title : ""}
                                    onChange={() => {}}
                                    placeholder="Search products"
                                    autoComplete="off"
                                    fullWidth
                                  />
                                  <Box minWidth="100px">
                                    <Button
                                      onClick={async () => {
                                        if (typeof window.shopify?.resourcePicker !== 'function') {
                                          alert('Shopify resourcePicker API is not available. Make sure your app is embedded in Shopify admin.');
                                          return;
                                        }
                                        try {
                                          const selected = await window.shopify.resourcePicker({
                                            type: 'product',
                                            multiple: false,
                                            title: 'Select gift product',
                                            selectButtonText: 'Select'
                                          });
                                          if (selected && selected.length > 0) {
                                            handleDiscountField(i, j, 'selectedProduct', selected[0]);
                                          }
                                        } catch (e) {
                                          // User cancelled or error
                                        }
                                      }}
                                    >
                                      Browse
                                    </Button>
                                  </Box>
                                </Box>
                                <Box display="flex" gap="400" marginBlockStart="400">
                                  <Button destructive onClick={() => handleRemoveDiscount(i, j)}>
                                    Delete
                                  </Button>
                                  <Button primary>
                                    Done
                                  </Button>
                                </Box>
                              </BlockStack>
                            </Box>
                          );
                        }
                        if (disc.type === "shipping") {
                          const key = `${i}_${j}`;
                          const opts = shippingOptions[key] || { exclude: false, amount: "0.00", appliesTo: "all", countrySearch: '', selectedCountries: [] };
                          return (
                            <Box key={disc.id} background="bg-surface" borderRadius="200" padding="400" marginBlockStart="400" marginBlockEnd="400">
                              <BlockStack gap="loose">
                                <Box display="flex" alignItems="center" gap="200">
                                  <Icon source="TruckMajor" color="base" />
                                  <Text variant="headingSm">Free shipping</Text>
                                </Box>
                                <Box marginBlockStart="200">
                                  <Select
                                    label="Applies to"
                                    options={[
                                      { label: "All countries", value: "all" },
                                      { label: "Specific countries", value: "specific" },
                                    ]}
                                    value={opts.appliesTo}
                                    onChange={val => setShippingOptions(prev => ({ ...prev, [key]: { ...opts, appliesTo: val } }))}
                                  />
                                </Box>
                                {opts.appliesTo === 'specific' && (
                                  <Box marginBlockStart="200">
                                    <Box style={{
                                      border: '1px solid #D9DBE9',
                                      borderRadius: 12,
                                      background: '#fff',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                      padding: 0,
                                      maxHeight: 400,
                                      display: 'flex',
                                      flexDirection: 'column',
                                    }}>
                                      <Box style={{
                                        maxHeight: 340,
                                        overflowY: 'auto',
                                        padding: '8px 0 0 0',
                                      }}>
                                        {countryList.filter(c => c.name.toLowerCase().includes((opts.countrySearch || '').toLowerCase())).map(c => {
                                          const selectedCountries = Array.isArray(opts.selectedCountries) ? opts.selectedCountries : [];
                                          const already = selectedCountries.some(sel => sel.code === c.code);
                                          return (
                                            <Box
                                              key={c.code}
                                              display="flex"
                                              alignItems="center"
                                              gap="200"
                                              padding="200"
                                              style={{ cursor: 'pointer', background: already ? '#f0f6ff' : 'transparent', transition: 'background 0.2s' }}
                                              onClick={() => {
                                                setShippingOptions(prev => ({
                                                  ...prev,
                                                  [key]: {
                                                    ...opts,
                                                    selectedCountries: already
                                                      ? selectedCountries.filter(sel => sel.code !== c.code)
                                                      : [...selectedCountries, c]
                                                  }
                                                }));
                                              }}
                                            >
                                              <span style={{ display: 'flex', alignItems: 'center' }}>
                                                {c.Flag ? (
                                                  <c.Flag style={{ width: 24, height: 16, marginRight: 8, verticalAlign: 'middle' }} />
                                                ) : (
                                                  <span style={{ fontSize: 20, marginRight: 8 }}>{c.flag || c.code}</span>
                                                )}
                                                <span>{c.name} ({c.code})</span>
                                              </span>
                                              {already && <span style={{ marginLeft: 'auto', color: '#0070f3' }}>✓</span>}
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                      <Box style={{ padding: 12, borderTop: '1px solid #F0F1F7', background: '#fff' }}>
                                        <TextField
                                          placeholder="Search countries"
                                          value={opts.countrySearch}
                                          onChange={val => setShippingOptions(prev => ({ ...prev, [key]: { ...opts, countrySearch: val } }))}
                                          autoComplete="off"
                                          fullWidth
                                        />
                                      </Box>
                                    </Box>
                                  </Box>
                                )}
                                <Box marginBlockStart="200">
                                  <Checkbox
                                    label="Exclude shipping rates over a certain amount"
                                    checked={opts.exclude}
                                    onChange={val => setShippingOptions(prev => ({ ...prev, [key]: { ...opts, exclude: val } }))}
                                  />
                                </Box>
                                {opts.exclude && (
                                  <Box marginBlockStart="200">
                                    <TextField
                                      prefix="₹"
                                      value={opts.amount}
                                      onChange={val => setShippingOptions(prev => ({ ...prev, [key]: { ...opts, amount: val } }))}
                                      placeholder="0.00"
                                      fullWidth
                                    />
                                  </Box>
                                )}
                                <Box display="flex" gap="400" marginBlockStart="400">
                                  <Button destructive onClick={() => handleRemoveDiscount(i, j)}>
                                    Delete
                                  </Button>
                                  <Button primary>
                                    Done
                                  </Button>
                                </Box>
                              </BlockStack>
                            </Box>
                          );
                        }
                        return null;
                      })}
                      {/* Add discount popover menu */}
                      <Polaris.Popover
                        active={discountPopover.open && discountPopover.tierIdx === i}
                        activator={
                          <Button
                            icon="add"
                            onClick={() => handleOpenDiscountPopover(i)}
                            plain
                            tone="primary"
                          >
                            Add discount
                          </Button>
                        }
                        onClose={handleCloseDiscountPopover}
                        autofocusTarget="first-node"
                      >
                        <Polaris.ActionList
                          items={discountMenuOptions.map(opt => ({
                            content: (
                              <Box>
                                <Text variant="bodyMd" fontWeight="medium">{opt.label}</Text>
                                <Text color="subdued" variant="bodySm">{opt.description}</Text>
                              </Box>
                            ),
                            onAction: () => handleAddDiscountType(i, opt.type),
                            icon: opt.icon,
                          }))}
                        />
                      </Polaris.Popover>
                      {tiers.length > 1 && (
                        <Button
                          icon="delete"
                          onClick={() => handleRemoveTier(i)}
                          plain
                          destructive
                        >
                          Remove tier
                        </Button>
                      )}
                    </BlockStack>
                  </Box>
                ))}
                <Button icon="add" onClick={handleAddTier} plain tone="primary">
                  Add tier
                </Button>
              </BlockStack>
            </Card>

            {/* Customer eligibility */}
            <Card>
              <BlockStack gap="loose">
                <Text variant="headingSm">Customer eligibility</Text>
                <RadioButton
                  label="All customers"
                  checked={eligibility === "all"}
                  onChange={() => setEligibility("all")}
                  name="eligibility"
                />
                <RadioButton
                  label="Specific customer segments"
                  checked={eligibility === "segments"}
                  onChange={() => setEligibility("segments")}
                  name="eligibility"
                />
                {eligibility === "segments" && (
                  <Button onClick={handleSegmentToggle} plain>
                    {selectedSegments.length === 0 ? "Select segments" : `${selectedSegments.length} segment(s) selected`}
                  </Button>
                )}
              </BlockStack>
            </Card>

            {/* Combinations */}
            <Card>
              <BlockStack gap="loose">
                <Text variant="headingSm">Combinations</Text>
                <Text color="subdued" as="span">
                  This discount can be combined with:
                </Text>
                <Checkbox
                  label="Product discounts"
                  checked={combos.product}
                  onChange={(val) => setCombos({ ...combos, product: val })}
                />
                <Checkbox
                  label="Order discounts"
                  checked={combos.order}
                  onChange={(val) => setCombos({ ...combos, order: val })}
                />
                <Checkbox
                  label="Shipping discounts"
                  checked={combos.shipping}
                  onChange={(val) => setCombos({ ...combos, shipping: val })}
                />
              </BlockStack>
            </Card>

            {/* Maximum discount uses */}
            <Card>
              <BlockStack gap="loose">
                <Text variant="headingSm">Maximum discount uses</Text>
                <Checkbox
                  label="Limit number of times this discount can be used in total"
                  checked={maxUses}
                  onChange={setMaxUses}
                />
                <Checkbox
                  label="Limit to one use per customer"
                  checked={maxUsesPerCustomer}
                  onChange={setMaxUsesPerCustomer}
                />
              </BlockStack>
            </Card>

            {/* Active dates */}
            <Card>
              <BlockStack gap="loose">
                <Text variant="headingSm">Active dates</Text>
                <InlineStack gap="loose">
                  <TextField
                    label="Start date"
                    type="date"
                    value={startDate}
                    onChange={setStartDate}
                  />
                  <TextField
                    label="Start time (IST)"
                    value={startTime}
                    onChange={setStartTime}
                  />
                </InlineStack>
                <Checkbox
                  label="Set end date"
                  checked={hasEndDate}
                  onChange={handleSetEndDate}
                />
                {hasEndDate && (
                  <InlineStack gap="loose">
                    <TextField
                      label="End date"
                      type="date"
                      value={endDate}
                      onChange={setEndDate}
                    />
                    <TextField
                      label="End time (IST)"
                      value={endTime}
                      onChange={setEndTime}
                    />
                  </InlineStack>
                )}
              </BlockStack>
            </Card>

            {/* Save button */}
            <Box display="flex" justifyContent="end">

              <Button primary onClick={handleSave} loading={fetcher.state === "submitting"}>Save</Button>
            </Box>
          </BlockStack>
        </Layout.Section>

        {/* Summary card (right side) */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="200">
            <Card>
              <BlockStack gap="100">
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Text variant="headingMd">Markets</Text>
                  <Button plain size="slim">Manage</Button>
                </Box>
                <Text color="subdued">Included on all markets.</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="100">
                <Text variant="headingMd">{discountCode ? discountCode : 'No discount code yet'}</Text>
                <Text color="subdued">Code</Text>
                <Text variant="headingSm">Type</Text>
                <Text>Multi-class tier discount</Text>
                <Text variant="headingSm">Details</Text>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>For Online Store</li>
                  {minType === 'amount' && <li>Spend ₹{tiers[0]?.minAmount || '0.00'}</li>}
                  {minType === 'quantity' && <li>Buy {tiers[0]?.minQty || '0'} items</li>}
                  {tiers[0]?.discounts?.length > 0 && tiers[0].discounts.map((disc, idx) => {
                    if (disc.type === 'product') {
                      const value = disc.value || 0;
                      const type = disc.discountType || 'percentage';
                      let label = '';
                      if (type === 'percentage') label = `Get ${value}% off`;
                      else if (type === 'amount') label = `Get ₹${value} off`;
                      if (disc.appliesTo === 'products' && Array.isArray(disc.selectedProducts) && disc.selectedProducts.length > 0) {
                        label += ` on ${disc.selectedProducts.map(p => p.title).join(', ')}`;
                      } else if (disc.appliesTo === 'collections' && Array.isArray(disc.selectedCollections) && disc.selectedCollections.length > 0) {
                        label += ` on collections: ${disc.selectedCollections.map(c => c.title).join(', ')}`;
                      }
                      return <li key={idx}>{label}</li>;
                    }
                    if (disc.type === 'order') {
                      const value = disc.value || 0;
                      const type = disc.discountType || 'amount';
                      let label = '';
                      if (type === 'percentage') label = `${value}% off entire order`;
                      else if (type === 'amount') label = `₹${value} off entire order`;
                      return <li key={idx}>{label}</li>;
                    }
                    if (disc.type === 'gift') {
                      let label = 'Get 1 item free';
                      if (disc.selectedProduct && disc.selectedProduct.title) {
                        label = `Get ${disc.selectedProduct.title} free`;
                      }
                      return <li key={idx}>{label}</li>;
                    }
                    if (disc.type === 'shipping') {
                      let label = 'Free shipping';
                      if (disc.appliesTo === 'all' || !disc.appliesTo) label += ' for all countries';
                      else if (disc.appliesTo === 'specific' && Array.isArray(disc.selectedCountries) && disc.selectedCountries.length > 0) {
                        label += ` for ${disc.selectedCountries.map(c => c.name).join(', ')}`;
                      }
                      return <li key={idx}>{label}</li>;
                    }
                    return null;
                  })}
                  <li>For all customers</li>
                  <li>No usage limits</li>
                  {purchaseType === 'one-time' && <li>Applies to one-time purchases</li>}
                  {purchaseType === 'subscription' && <li>Applies to subscriptions</li>}
                  {purchaseType === 'both' && <li>Applies to subscriptions and one-time purchases</li>}
                  <li>Active from today</li>
                </ul>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Customer segment modal */}
      {showSegmentModal && (
        <Polaris.Modal
          open={showSegmentModal}
          onClose={handleSegmentToggle}
          title="Select customer segments"
          primaryAction={{ content: "Done", onAction: handleSegmentToggle }}
        >
          <Polaris.Modal.Section>
            <TextField
              label="Search segments"
              value={segmentSearch}
              onChange={setSegmentSearch}
              autoComplete="off"
            />
            <BlockStack gap="tight">
              {segmentOptions
                .filter((seg) =>
                  seg.title.toLowerCase().includes(segmentSearch.toLowerCase())
                )
                .map((seg) => (
                  <Checkbox
                    key={seg.id}
                    label={seg.title}
                    checked={selectedSegments.includes(seg.id)}
                    onChange={(checked) => {
                      setSelectedSegments((prev) =>
                        checked
                          ? [...prev, seg.id]
                          : prev.filter((id) => id !== seg.id)
                      );
                    }}
                  />
                ))}
            </BlockStack>
            <Box paddingBlockStart="200">
              <a
                href={`https://${shopDomain}/admin/segments`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Manage segments in Shopify admin
              </a>
            </Box>
          </Polaris.Modal.Section>
        </Polaris.Modal>
      )}
    </Page>
  );
}
