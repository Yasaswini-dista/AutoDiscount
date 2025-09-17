import { useState } from "react";
import { json } from "@remix-run/node";
// import { useLoaderData } from "@remix-run/react";
import * as Polaris from "@shopify/polaris";
import { DeleteIcon } from '@shopify/polaris-icons';
import shopify from "../shopify.server";


// Loader removed; segments and error are now passed as props from parent route
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

export default function MultiValueDiscount({ onBack, initialStartTime, segments = [], error }) {
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
  const [discountMethod, setDiscountMethod] = useState("code");
  const [discountCode, setDiscountCode] = useState("");
  const [appliesTo, setAppliesTo] = useState("specific_collections");
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [pendingAppliesTo, setPendingAppliesTo] = useState(null);
  const [purchaseType, setPurchaseType] = useState("one-time");
  const [discountValues, setDiscountValues] = useState([
    {
      id: 1,
      type: "percentage",
      value: "",
      collections: [],
      productVariants: [],
    },
  ]);
  const [eligibility, setEligibility] = useState("all");
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [combos, setCombos] = useState({ product: false, order: false, shipping: false });
  const [maxUses, setMaxUses] = useState(false);
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState(false);
  const [segmentSearch, setSegmentSearch] = useState("");
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentOptions, setSegmentOptions] = useState(segments || []);
  // Store date as string in YYYY-MM-DD format for text input
  function getDefaultDateString() {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }
  const [startDate, setStartDate] = useState(getDefaultDateString());
  // Set startTime to current time (hh:mm AM/PM) if not provided, matching GiftWithPurchaseDiscount
  function getDefaultStartTime12() {
    const now = new Date();
    let hour = now.getHours();
    const minute = now.getMinutes();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  }
  // Store time in 12-hour format for input and display
  const [startTime, setStartTime] = useState(initialStartTime || getDefaultStartTime12());
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState(getDefaultDateString());
  // Helper to validate and format date input (YYYY-MM-DD or DD-MM-YYYY)
  function normalizeDateInput(val) {
    // Accepts YYYY-MM-DD or DD-MM-YYYY, returns YYYY-MM-DD if valid, else raw
    if (!val) return "";
    let v = val.trim();
    // If DD-MM-YYYY, convert to YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
      const [d, m, y] = v.split('-');
      return `${y}-${m}-${d}`;
    }
    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return v;
    }
    return val; // Let user type
  }
  const [endTime, setEndTime] = useState("");

  // Helper to validate and format 12-hour time input
  function normalize12HourTime(val) {
    // Accepts input like '9:10 am', '09:10 AM', '12:59 pm', etc.
    if (!val) return "";
    let v = val.trim().toUpperCase();
    // Add space before AM/PM if missing
    v = v.replace(/(AM|PM)$/i, ' $1');
    // Remove extra spaces
    v = v.replace(/\s+/g, ' ');
    // Validate format
    const match = v.match(/^(1[0-2]|0?[1-9]):([0-5][0-9]) ?(AM|PM)$/i);
    if (!match) return val; // Let user type, don't block
    let hour = parseInt(match[1], 10);
    let minute = match[2];
    let ampm = match[3].toUpperCase();
    return `${hour}:${minute} ${ampm}`;
  }

  // Helper to format 24-hour time string ("09:57") to 12-hour format with AM/PM ("9:57 AM")
  function formatTime12Hour(time24) {
    if (!time24) return "--:--";
    const [h, m] = time24.split(":");
    let hour = parseInt(h, 10);
    if (isNaN(hour)) return "--:--";
    const minute = m.padStart(2, '0');
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${ampm}`;
  }

  // Discount value handlers
  const handleDiscountValueChange = (idx, field, val) => {
    setDiscountValues(values => values.map((d, i) => i === idx ? { ...d, [field]: val } : d));
  };
  const handleAddDiscount = () => {
    setDiscountValues(values => [
      ...values,
      { id: Date.now(), type: "percentage", value: "", collections: [], productVariants: [] },
    ]);
  };
  const handleRemoveDiscount = (idx) => {
    setDiscountValues(values => values.filter((_, i) => i !== idx));
  };

  // Handle appliesTo change with confirmation
  const handleAppliesToChange = (val) => {
    if (val !== appliesTo) {
      setPendingAppliesTo(val);
      setShowChangeModal(true);
    }
  };

  const confirmChangeAppliesTo = () => {
    setAppliesTo(pendingAppliesTo);
    setShowChangeModal(false);
    setPendingAppliesTo(null);
    // Reset all discount values
    setDiscountValues([
      { id: 1, type: "percentage", value: "", collections: [], productVariants: [] }
    ]);
  };

  const cancelChangeAppliesTo = () => {
    setShowChangeModal(false);
    setPendingAppliesTo(null);
  };

  // Browse logic for each discount value
  const handleBrowse = async (idx) => {
    if (appliesTo === "specific_collections") {
      if (typeof window.shopify?.resourcePicker !== 'function') {
        alert('Shopify resourcePicker API is not available. Make sure your app is embedded in Shopify admin.');
        return;
      }
      try {
        const selected = await window.shopify.resourcePicker({ type: 'collection', multiple: true });
        if (selected && selected.length > 0) {
          setDiscountValues(values => values.map((d, i) => i === idx ? { ...d, collections: selected, productVariants: [] } : d));
        }
      } catch (e) {}
    } else if (appliesTo === "specific_product_variants") {
      if (typeof window.shopify?.resourcePicker !== 'function') {
        alert('Shopify resourcePicker API is not available. Make sure your app is embedded in Shopify admin.');
        return;
      }
      try {
        const selected = await window.shopify.resourcePicker({ type: 'product', multiple: true, variants: true });
        if (selected && selected.length > 0) {
          setDiscountValues(values => values.map((d, i) => i === idx ? { ...d, productVariants: selected, collections: [] } : d));
        }
      } catch (e) {}
    }
  };

  // End date logic
  function handleSetEndDate(checked) {
    setHasEndDate(checked);
    if (checked) {
      const today = new Date();
      setEndDate(today);
      setEndTime("23:59");
    }
  }

  return (
    <Page title="Create multi-value discount" backAction={{ content: 'Back', onAction: onBack }}>
      <Layout>
        <Layout.Section>
          <Layout>
            <Layout.Section>
              {/* Multi-value discount method */}
              <Card sectioned>
                <BlockStack gap="400">
                  <Text variant="headingLg" as="h1">Multi-value discount</Text>
                  <Text variant="headingMd">Method</Text>
                  <InlineStack gap="200">
                    <Button pressed={discountMethod === "code"} onClick={() => setDiscountMethod("code")}>Discount code</Button>
                    <Button pressed={discountMethod === "automatic"} onClick={() => setDiscountMethod("automatic")}>Automatic discount</Button>
                  </InlineStack>
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
              {/* Purchase requirements */}
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Purchase requirements</Text>
                  <InlineStack gap="300" wrap>
                    <div className="Polaris-FormLayout__Item Polaris-FormLayout--grouped" style={{ flex: 1, minWidth: 0 }}>
                      <Select
                        label="Applies to"
                        options={[
                          { label: "Specific collections", value: "specific_collections" },
                          { label: "Specific product variants", value: "specific_product_variants" },
                        ]}
                        value={appliesTo}
                        onChange={handleAppliesToChange}
                      />
                    </div>
                    <div className="Polaris-FormLayout__Item Polaris-FormLayout--grouped" style={{ flex: 1, minWidth: 0 }}>
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
                  {appliesTo === "specific_collections" ? (
                    <Text color="subdued">Specific collections are recommended for selecting a large number of products.</Text>
                  ) : (
                    <Text color="subdued">Specific product variants are recommended for a small number of variant specific discounts.</Text>
                  )}
                </BlockStack>
              </Card>
              {/* Discount values */}
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Discount values</Text>
                  <Text color="subdued">Add multiple discount values for different collections.</Text>
                  {discountValues.map((d, idx) => (
                    <Box key={d.id} background="bg-surface-secondary" borderColor="border" borderWidth="025" borderRadius="300" padding="400" marginBlockEnd="4" position="relative">
                      {/* Delete icon absolutely positioned in top-right */}
                      {discountValues.length > 1 && (
                        <Button
                          icon={<Icon source={DeleteIcon} color="critical" />}
                          onClick={() => handleRemoveDiscount(idx)}
                          plain
                          accessibilityLabel="Delete discount"
                          style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}
                        />
                      )}
                      <BlockStack gap="300">
                        <Text variant="headingSm" fontWeight="bold">Discount {idx + 1}</Text>
                        <InlineStack gap="200">
                          <Select
                            label="Discount value"
                            options={[
                              { label: "Percentage", value: "percentage" },
                              { label: "Fixed amount", value: "fixed" },
                            ]}
                            value={d.type}
                            onChange={val => handleDiscountValueChange(idx, "type", val)}
                            style={{ minWidth: 180 }}
                          />
                          <TextField
                            label=" "
                            value={d.value}
                            onChange={val => handleDiscountValueChange(idx, "value", val)}
                            type="number"
                            suffix={d.type === "percentage" ? "%" : "₹"}
                            placeholder="0"
                            style={{ minWidth: 120 }}
                          />
                        </InlineStack>
                        <Box marginBlockStart="2">
                          <Text variant="bodyMd" color="subdued">Applies to specific collections</Text>
                        </Box>
                        <InlineStack gap="200">
                          <TextField
                            label="Applies to specific collections"
                            value={d.collections && d.collections.length > 0 ? d.collections.map(c => c.title).join(", ") : ""}
                            placeholder="Search collections"
                            autoComplete="off"
                            readOnly
                            fullWidth
                            prefix={<Icon source="SearchMinor" color="subdued" />} // mimic Shopify admin
                            variant="outlined"
                          />
                          <Button onClick={() => handleBrowse(idx)}>
                            Browse
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Box>
                  ))}
                  <Box marginBlockStart="2">
                    <Button outline icon={<Icon source="CirclePlusMajor" color="interactive" />} onClick={handleAddDiscount} fullWidth>
                      <Text color="interactive">Create another discount</Text>
                    </Button>
                  </Box>
                  {/* Change purchase requirements modal */}
                  {showChangeModal && (
                    <Polaris.Modal
                      open={showChangeModal}
                      onClose={cancelChangeAppliesTo}
                      title="Change purchase requirements?"
                      primaryAction={{ content: 'Confirm change', destructive: true, onAction: confirmChangeAppliesTo }}
                      secondaryActions={[{ content: 'Cancel', onAction: cancelChangeAppliesTo }]}
                    >
                      <BlockStack gap="200">
                        <Text as="p">
                          Are you sure you want to change the customer purchase requirements from <b>{appliesTo === 'specific_collections' ? 'Specific collections' : 'Specific product variants'}</b> to <b>{pendingAppliesTo === 'specific_collections' ? 'Specific collections' : 'Specific product variants'}</b>? This will reset any discounts you may have already set and can’t be undone.
                        </Text>
                      </BlockStack>
                    </Polaris.Modal>
                  )}
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
                          <Button
                            onClick={() => {
                              setShowSegmentModal(true);
                              setSegmentOptions(segments || []);
                            }}
                          >
                            Browse
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  {/* Customer segment browse modal (realtime) */}
                  {showSegmentModal && (
                    <Polaris.Modal
                      open={showSegmentModal}
                      onClose={() => setShowSegmentModal(false)}
                      title="Browse customer segments"
                      primaryAction={{ content: 'Select', onAction: () => setShowSegmentModal(false) }}
                      secondaryActions={[{ content: 'Cancel', onAction: () => setShowSegmentModal(false) }]}
                    >
                      <BlockStack gap="200">
                        <TextField
                          label="Search segments"
                          value={segmentSearch}
                          onChange={(val) => {
                            setSegmentSearch(val);
                            // Simple client-side filter for demo; for real search, implement in loader
                            if (!val) {
                              setSegmentOptions(segments || []);
                            } else {
                              setSegmentOptions((segments || []).filter(seg => seg.title.toLowerCase().includes(val.toLowerCase())));
                            }
                          }}
                          placeholder="Search segments"
                          autoComplete="off"
                          fullWidth
                        />
                        {segmentLoading ? (
                          <Text>Loading...</Text>
                        ) : (
                          <Box style={{ maxHeight: 200, overflowY: 'auto' }}>
                            {segmentOptions.length === 0 ? (
                              <Text color="subdued">No segments found.</Text>
                            ) : (
                              segmentOptions.map(seg => (
                                <Box key={seg.id} padding="200" background={selectedSegments.some(s => s.id === seg.id) ? 'bg-fill-tertiary' : undefined} borderRadius="200" onClick={() => {
                                  setSelectedSegments(sel => sel.some(s => s.id === seg.id) ? sel.filter(s => s.id !== seg.id) : [...sel, seg]);
                                }} style={{ cursor: 'pointer', marginBottom: 4 }}>
                                  <Text>{seg.title}</Text>
                                </Box>
                              ))
                            )}
                          </Box>
                        )}
                      </BlockStack>
                    </Polaris.Modal>
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
                      onChange={val => setStartDate(normalizeDateInput(val))}
                      type="text"
                      prefix={<Icon source="CalendarMinor" color="subdued" />} // calendar icon
                      placeholder="YYYY-MM-DD"
                      autoComplete="off"
                      maxLength={10}
                    />
                    <TextField
                      label="Start time (IST)"
                      value={startTime}
                      onChange={val => setStartTime(normalize12HourTime(val))}
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
                    onChange={handleSetEndDate}
                  />
                  {hasEndDate && (
                    <InlineStack gap="200">
                      <TextField
                        label="End date"
                        value={endDate}
                        onChange={val => setEndDate(normalizeDateInput(val))}
                        type="text"
                        prefix={<Icon source="CalendarMinor" color="subdued" />} // calendar icon
                        placeholder="YYYY-MM-DD"
                        autoComplete="off"
                        maxLength={10}
                      />
                      <TextField
                        label="End time (IST)"
                        value={endTime}
                        onChange={val => setEndTime(normalize12HourTime(val))}
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
                    <Text>Multi-value discount</Text>
                    <Text variant="headingSm">Details</Text>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>For Online Store</li>
                      <li>For all customers</li>
                      <li>No usage limits</li>
                      <li>Applies to one-time purchases</li>
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
