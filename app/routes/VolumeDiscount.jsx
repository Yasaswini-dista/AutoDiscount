import { useState } from "react";
import * as Polaris from "@shopify/polaris";
import { DeleteIcon, PlusCircleIcon } from '@shopify/polaris-icons';

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

export default function VolumeDiscount({ onBack, initialStartTime, segments = [], error, shopDomain }) {
  // Error/empty state
  if (error) {
    return (
      <Polaris.Card>
        <Polaris.Box padding="400">
          <Polaris.Banner tone="critical">
            <p>Error loading customer segments: {error}</p>
          </Polaris.Banner>
        </Polaris.Box>
      </Polaris.Card>
    );
  }
  if (!segments || segments.length === 0) {
    return (
      <Polaris.Card>
        <Polaris.Box padding="400">
          <Polaris.EmptyState
            heading="No customer segments found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Create customer segments in your Shopify admin to target specific groups for discounts.</p>
          </Polaris.EmptyState>
        </Polaris.Box>
      </Polaris.Card>
    );
  }

  // Form state
  const [discountMethod, setDiscountMethod] = useState("code"); // "code" or "automatic"
  const [discountCode, setDiscountCode] = useState("");
  const [minType, setMinType] = useState("amount");
  const [amount, setAmount] = useState("");
  const [minQty, setMinQty] = useState("1");
  const [appliesTo, setAppliesTo] = useState("all");
  const [purchaseType, setPurchaseType] = useState("one-time");
  const [specificProducts, setSpecificProducts] = useState([]);
  const [specificCollections, setSpecificCollections] = useState([]);
  const [discountType, setDiscountType] = useState("percentage");
  const [discountAppliesToItems, setDiscountAppliesToItems] = useState(false);
  const [minPerVariant, setMinPerVariant] = useState(false);
  const [tierValues, setTierValues] = useState([
    { id: 1, minAmount: "", minQty: "", percent: "", amount: "" },
  ]);
  const [eligibility, setEligibility] = useState("all");
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [segmentSearch, setSegmentSearch] = useState("");
  const [segmentOptions, setSegmentOptions] = useState(segments || []);
  const [combos, setCombos] = useState({ product: false, order: false, shipping: false });
  const [maxUses, setMaxUses] = useState(false);
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState(false);
  function getDefaultDateString() {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }
  const [startDate, setStartDate] = useState(getDefaultDateString());
  function getDefaultStartTime12() {
    const now = new Date();
    let hour = now.getHours();
    const minute = now.getMinutes();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  }
  const [startTime, setStartTime] = useState(initialStartTime || getDefaultStartTime12());
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState(getDefaultDateString());
  const [endTime, setEndTime] = useState("");

  // Tier logic
  const handleTierChange = (idx, field, val) => {
    setTierValues(values => values.map((t, i) => i === idx ? { ...t, [field]: val } : t));
  };
  const handleAddTier = () => {
    setTierValues(values => [
      ...values,
      { id: Date.now(), minAmount: "", minQty: "", percent: "", amount: "" },
    ]);
  };
  const handleRemoveTier = (idx) => {
    setTierValues(values => values.filter((_, i) => i !== idx));
  };

  // Segment modal logic
  const handleSegmentToggle = () => setShowSegmentModal(v => !v);

  // UI
  return (
    <Page title="Create volume discount" backAction={{ content: 'Back', onAction: onBack }}>
      <Layout>
        <Layout.Section>
          <Layout>
            <Layout.Section>
              {/* Volume discount method */}
              <Card sectioned>
                <BlockStack gap="400">
                  <Text variant="headingLg" as="h1">Volume discount</Text>
                  <Text variant="headingMd">Method</Text>
                  <InlineStack gap="200">
                    <Button pressed={discountMethod === "code"} onClick={() => setDiscountMethod("code")}>Discount code</Button>
                    <Button pressed={discountMethod === "automatic"} onClick={() => setDiscountMethod("automatic")}>Automatic discount</Button>
                  </InlineStack>
                  {discountMethod === "automatic" && (
                    <Box paddingBlockStart="2">
                      <Polaris.Banner tone="info">
                        Select a plan to create automatic discount functions.{' '}
                        <a href="https://www.shopify.com/pricing" target="_blank" rel="noopener noreferrer">Select a plan</a>
                      </Polaris.Banner>
                    </Box>
                  )}
                  {discountMethod === "code" && (
                    <Box paddingBlockStart="2">
                      <TextField
                        label="Discount code"
                        value={discountCode}
                        onChange={setDiscountCode}
                        helpText="Create a URL-friendly discount code that avoids special characters. Customers will see this code in their cart and checkout."
                        maxLength={64}
                      />
                    </Box>
                  )}
                </BlockStack>
              </Card>
              {/* Minimum purchase requirements */}
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Minimum purchase requirements</Text>
                  <Text color="subdued">Set up minimum purchase requirements and then define individual discount tiers.</Text>
                  <Text variant="headingSm" fontWeight="bold">Customer buys</Text>
                  <BlockStack gap="100">
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
                          { label: "Both", value: "both" },
                        ]}
                        value={purchaseType}
                        onChange={setPurchaseType}
                      />
                    </div>
                  </InlineStack>
                  {/* Per-variant checkbox for minimum purchase amount */}
                  {minType === "amount" && (
                    <Box marginBlockStart="2">
                      <Checkbox
                        label="Set minimum required purchase amount per product variant"
                        checked={minPerVariant}
                        onChange={setMinPerVariant}
                      />
                      <Text color="subdued" variant="bodySm" style={{ marginLeft: 32 }}>
                        If unchecked, the minimum purchase amount can include a mix of any selected product variants.
                      </Text>
                    </Box>
                  )}
                </BlockStack>
              </Card>
              {/* Customer gets */}
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Customer gets</Text>
                  <RadioButton
                    label="Percentage discount"
                    checked={discountType === "percentage"}
                    onChange={() => setDiscountType("percentage")}
                    name="discountType"
                  />
                  <RadioButton
                    label="Amount off each"
                    checked={discountType === "amount"}
                    onChange={() => setDiscountType("amount")}
                    name="discountType"
                  />
                  <RadioButton
                    label="Free gift"
                    checked={discountType === "gift"}
                    onChange={() => setDiscountType("gift")}
                    name="discountType"
                  />
                  <Checkbox
                    label="Discount applies to the items customer buys"
                    checked={discountAppliesToItems}
                    onChange={setDiscountAppliesToItems}
                  />
                  {/* Hide applies to if discountAppliesToItems is checked */}
                  {!discountAppliesToItems && (
                    <>
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
                    </>
                  )}
                </BlockStack>
              </Card>
              {/* Tier values */}
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Tier values</Text>
                  <Text color="subdued">Define tier values that increase with each new tier.</Text>
                  {tierValues.map((tier, idx) => (
                    <Box key={tier.id} background="bg-surface-secondary" borderColor="border" borderWidth="025" borderRadius="300" padding="400" marginBlockEnd="4" position="relative">
                      <BlockStack gap="300">
                        <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                          <Text variant="headingSm" fontWeight="bold">Tier {idx + 1}</Text>
                          {tierValues.length > 1 && (
                            <Button
                              icon={<Icon source={DeleteIcon} color="critical" />}
                              onClick={() => handleRemoveTier(idx)}
                              plain
                              accessibilityLabel="Delete tier"
                            />
                          )}
                        </Box>
                        {minType === "amount" ? (
                          <TextField
                            label="Minimum purchase amount"
                            value={tier.minAmount}
                            onChange={val => handleTierChange(idx, "minAmount", val)}
                            prefix="₹"
                            placeholder="0.00"
                            type="number"
                          />
                        ) : (
                          <TextField
                            label="Minimum quantity of items"
                            value={tier.minQty}
                            onChange={val => handleTierChange(idx, "minQty", val)}
                            placeholder="0"
                            type="number"
                          />
                        )}
                        {discountType === "percentage" && (
                          <TextField
                            label="Percentage discount"
                            value={tier.percent}
                            onChange={val => handleTierChange(idx, "percent", val)}
                            suffix="%"
                            placeholder="0"
                            type="number"
                          />
                        )}
                        {discountType === "amount" && (
                          <TextField
                            label="Amount off each"
                            value={tier.amount}
                            onChange={val => handleTierChange(idx, "amount", val)}
                            prefix="₹"
                            placeholder="0.00"
                            type="number"
                          />
                        )}
                        {/* Free gift UI can be added here if needed */}
                      </BlockStack>
                    </Box>
                  ))}
                  <Box marginBlockStart="2">
                    <Button outline onClick={handleAddTier} fullWidth>
                      <span style={{ color: '#005BD3', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon source={PlusCircleIcon} color="interactive" />
                        Create another tier
                      </span>
                    </Button>
                  </Box>
                </BlockStack>
              </Card>
              {/* Customer eligibility */}
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Customer eligibility</Text>
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
                    <Box marginBlockStart="4">
                      <Text variant="bodyMd" fontWeight="medium">Select customer segments this discount applies to</Text>
                      <Box display="flex" alignItems="center" gap="200" marginBlockStart="2">
                        <TextField
                          label="Selected segments"
                          value={selectedSegments.map(s => s.title).join(", ")}
                          onChange={() => {}}
                          placeholder="No segments selected"
                          autoComplete="off"
                          readOnly
                          fullWidth
                        />
                        <Box minWidth="100px" marginBlockStart="5">
                          <Button onClick={handleSegmentToggle}>Browse</Button>
                        </Box>
                      </Box>
                      {/* Modal for segment selection - Shopify admin style */}
                      <Polaris.Modal
                        open={showSegmentModal}
                        onClose={handleSegmentToggle}
                        title="Add customer segments"
                        footerActionAlignment="right"
                        primaryAction={{
                          content: "Add",
                          onAction: handleSegmentToggle,
                        }}
                        secondaryActions={[
                          { content: "Close", onAction: handleSegmentToggle }
                        ]}
                      >
                        <BlockStack gap="200">
                          <Box paddingBlockEnd="200">
                            <Text as="span" color="subdued">
                              You can create a new segment from the{' '}
                              <a
                                href={shopDomain ? `https://admin.shopify.com/store/${shopDomain.replace(/\.myshopify\.com$/, '')}/customers/segments` : 'https://admin.shopify.com/customers/segments'}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#005BD3', textDecoration: 'underline' }}
                              >
                                Segments Page
                              </a>
                            </Text>
                          </Box>
                          <Box paddingBlockEnd="200">
                            <TextField
                              label=""
                              value={segmentSearch}
                              onChange={val => setSegmentSearch(val)}
                              placeholder="Search customer segments"
                              autoComplete="off"
                              fullWidth
                              prefix={<Icon source="SearchMinor" color="subdued" />}
                              style={{ background: '#fff', borderRadius: 6 }}
                            />
                          </Box>
                          <Box style={{ maxHeight: 250, overflowY: 'auto', background: '#fff', borderRadius: 8, padding: '8px 0' }}>
                            {segmentOptions.length === 0 ? (
                              <Text color="subdued" padding="200">No segments found.</Text>
                            ) : (
                              segmentOptions
                                .filter(seg => seg.title.toLowerCase().includes(segmentSearch.toLowerCase()))
                                .map(seg => (
                                  <Box key={seg.id} display="flex" alignItems="center" paddingBlock="100" paddingInline="400" borderRadius="100" style={{ marginBottom: 4 }}>
                                    <Checkbox
                                      label={seg.title}
                                      checked={selectedSegments.some(s => s.id === seg.id)}
                                      onChange={() => {
                                        setSelectedSegments(sel => sel.some(s => s.id === seg.id)
                                          ? sel.filter(s => s.id !== seg.id)
                                          : [...sel, seg]);
                                      }}
                                    />
                                  </Box>
                                ))
                            )}
                          </Box>
                        </BlockStack>
                      </Polaris.Modal>
                    </Box>
                  )}
                </BlockStack>
              </Card>
              {/* Combinations */}
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Combinations</Text>
                  <Text>This discount can be combined with:</Text>
                  <Checkbox
                    label="Product discounts"
                    checked={combos.product}
                    onChange={v => setCombos({ ...combos, product: v })}
                  />
                  <Checkbox
                    label="Order discounts"
                    checked={combos.order}
                    onChange={v => setCombos({ ...combos, order: v })}
                  />
                  <Checkbox
                    label="Shipping discounts"
                    checked={combos.shipping}
                    onChange={v => setCombos({ ...combos, shipping: v })}
                  />
                </BlockStack>
              </Card>
              {/* Maximum discount uses */}
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Maximum discount uses</Text>
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
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Active dates</Text>
                  <InlineStack gap="200">
                    <TextField
                      label="Start date"
                      value={startDate}
                      onChange={val => setStartDate(val)}
                      type="text"
                      prefix={<Icon source="CalendarMinor" color="subdued" />} // calendar icon
                      placeholder="YYYY-MM-DD"
                      autoComplete="off"
                      maxLength={10}
                    />
                    <TextField
                      label="Start time (IST)"
                      value={startTime}
                      onChange={val => setStartTime(val)}
                      type="text"
                      prefix={<Icon source="ClockMinor" color="subdued" />} // always show clock icon
                      placeholder="hh:mm AM/PM"
                      autoComplete="off"
                      maxLength={8}
                    />
                  </InlineStack>
                  <Checkbox
                    label="Set end date"
                    checked={hasEndDate}
                    onChange={setHasEndDate}
                  />
                  {hasEndDate && (
                    <InlineStack gap="200">
                      <TextField
                        label="End date"
                        value={endDate}
                        onChange={val => setEndDate(val)}
                        type="text"
                        prefix={<Icon source="CalendarMinor" color="subdued" />} // calendar icon
                        placeholder="YYYY-MM-DD"
                        autoComplete="off"
                        maxLength={10}
                      />
                      <TextField
                        label="End time (IST)"
                        value={endTime}
                        onChange={val => setEndTime(val)}
                        type="text"
                        prefix={<Icon source="ClockMinor" color="subdued" />} // always show clock icon
                        placeholder="hh:mm AM/PM"
                        autoComplete="off"
                        maxLength={8}
                      />
                    </InlineStack>
                  )}
                </BlockStack>
              </Card>
              <Button primary>Save</Button>
            </Layout.Section>
            {/* Right column summary */}
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
                    <Text>Volume discount</Text>
                    <Text variant="headingSm">Details</Text>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>For Online Store</li>
                      {minType === 'amount' && minPerVariant && <li>Minimum purchase amount applies per product variant</li>}
                      <li>Customer gets: {discountType === 'percentage' ? 'percentage off on eligible variants' : discountType === 'amount' ? 'amount off each' : 'free gift'}</li>
                      {minType === 'amount' && <li>Spend ₹{amount || '0.00'}</li>}
                      {minType === 'quantity' && <li>Buy {minQty || '0'} items</li>}
                      {discountType === 'percentage' && <li>Get {tierValues[0]?.percent || '0'}% off</li>}
                      {discountType === 'amount' && <li>Get ₹{tierValues[0]?.amount || '0.00'} off</li>}
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
        </Layout.Section>
      </Layout>
    </Page>
  );
}
