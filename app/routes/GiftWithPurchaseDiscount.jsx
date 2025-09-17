
// Fetch customer segments from backend API route
async function fetchCustomerSegments(shopDomain, search = "") {
  const res = await fetch("/api.customerSegments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shopDomain, search })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to fetch customer segments");
  return json.segments;
}

import { useState } from "react";
import * as Polaris from "@shopify/polaris";
const {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  Button,
  Checkbox,
  DatePicker,
  InlineStack,
  BlockStack,
  Box,
  Text,
  Icon,
  RadioButton,
  Divider,
} = Polaris;

export default function GiftWithPurchaseDiscount({ onBack, initialStartTime }) {
  // Form state
  const [discountMethod, setDiscountMethod] = useState("code"); // "code" or "automatic"
  const [discountCode, setDiscountCode] = useState("");
  const [minType, setMinType] = useState("amount");
  const [amount, setAmount] = useState("");
  const [appliesTo, setAppliesTo] = useState("all");
  const [specificProducts, setSpecificProducts] = useState([]);
  const [specificCollections, setSpecificCollections] = useState([]);
  const [purchaseType, setPurchaseType] = useState("one-time");
  const [selectedGift, setSelectedGift] = useState(null);
  // const app = useAppBridge();
  // const pickerRef = useRef(null);

  const [eligibility, setEligibility] = useState("all");
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [segmentSearch, setSegmentSearch] = useState("");
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentOptions, setSegmentOptions] = useState([]);
  const [combos, setCombos] = useState({ product: false, order: false, shipping: false });
  const [maxUses, setMaxUses] = useState(false);
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState(false);
  const [oneGiftPerOrder, setOneGiftPerOrder] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(initialStartTime || "");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState(new Date());
  const [endTime, setEndTime] = useState("");

  // When hasEndDate is checked, set end date to today and end time to 23:59 if not already set
  function handleSetEndDate(checked) {
    setHasEndDate(checked);
    if (checked) {
      const today = new Date();
      setEndDate(today);
      setEndTime("23:59");
    }
  }

  // Handlers for form fields
  // ...implement as needed

  return (
    <Page title="Create gift with purchase discount" backAction={{ content: 'Back', onAction: onBack }}>
      <Layout>
        <Layout.Section>
          <Layout>
            <Layout.Section>
              <Card sectioned>
                <BlockStack gap="400">
                  <Text variant="headingLg" as="h1">Gift with purchase</Text>
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
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Customer buys</Text>
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
                  {minType === "amount" ? (
                    <TextField
                      label="Amount"
                      value={amount}
                      onChange={setAmount}
                      prefix="₹"
                      type="number"
                      placeholder="0.00"
                    />
                  ) : (
                    <TextField
                      label="Quantity"
                      value={amount}
                      onChange={setAmount}
                      type="number"
                    />
                  )}
                  <InlineStack gap="300" wrap>
                    <div className="Polaris-FormLayout__Item Polaris-FormLayout--grouped" style={{ flex: 1, minWidth: 0 }}>
                      <Select
                        label="Applies to"
                        options={[
                          { label: "All products", value: "all" },
                          { label: "Specific products", value: "specific_products" },
                          { label: "Specific collections", value: "specific_collections" },
                        ]}
                        value={appliesTo}
                        onChange={setAppliesTo}
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

                  {/* Applies to: Specific products */}
                  {appliesTo === "specific_products" && (
                    <Box marginBlockStart="4">
                      <Text variant="bodyMd" fontWeight="medium">Select products this discount applies to</Text>
                      <Box display="flex" alignItems="center" gap="200" marginBlockStart="2">
                        <TextField
                          label="Selected products"
                          value={specificProducts.map(p => p.title).join(", ")}
                          onChange={() => {}}
                          placeholder="No products selected"
                          autoComplete="off"
                          readOnly
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
                                const selected = await window.shopify.resourcePicker({ type: 'product', multiple: true });
                                if (selected && selected.length > 0) {
                                  setSpecificProducts(selected);
                                }
                              } catch (e) {
                                // User cancelled or error
                              }
                            }}
                          >
                            Browse products
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Applies to: Specific collections */}
                  {appliesTo === "specific_collections" && (
                    <Box marginBlockStart="4">
                      <Text variant="bodyMd" fontWeight="medium">Select collections this discount applies to</Text>
                      <Box display="flex" alignItems="center" gap="200" marginBlockStart="2">
                        <TextField
                          label="Selected collections"
                          value={specificCollections.map(c => c.title).join(", ")}
                          onChange={() => {}}
                          placeholder="No collections selected"
                          autoComplete="off"
                          readOnly
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
                                const selected = await window.shopify.resourcePicker({ type: 'collection', multiple: true });
                                if (selected && selected.length > 0) {
                                  setSpecificCollections(selected);
                                }
                              } catch (e) {
                                // User cancelled or error
                              }
                            }}
                          >
                            Browse collections
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  )}

                  <Divider />
                  <Text variant="headingMd">Customer gets free gift</Text>
                  <Box display="flex" alignItems="center" gap="200">
                    <TextField
                      label="Search products"
                      value={selectedGift ? selectedGift.title : ""}
                      onChange={() => {}}
                      placeholder="Search products"
                      autoComplete="off"
                      readOnly
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
                            const selected = await window.shopify.resourcePicker({ type: 'product', multiple: false });
                            if (selected && selected.length > 0) {
                              setSelectedGift(selected[0]);
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
                </BlockStack>
              </Card>
              {/* ...rest of the left column cards... */}
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
                            onClick={async () => {
                              setShowSegmentModal(true);
                              setSegmentLoading(true);
                              try {
                                // You must provide a valid shopDomain from your app/session
                                const shopDomain = window.shopifyShopDomain || "";
                                const segments = await fetchCustomerSegments(shopDomain, "");
                                setSegmentOptions(segments);
                              } catch (e) {
                                setSegmentOptions([]);
                              }
                              setSegmentLoading(false);
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
                          onChange={async (val) => {
                            setSegmentSearch(val);
                            setSegmentLoading(true);
                            try {
                              // You must provide a valid shopDomain from your app/session
                              const shopDomain = window.shopifyShopDomain || "";
                              const segments = await fetchCustomerSegments(shopDomain, val);
                              setSegmentOptions(segments);
                            } catch (e) {
                              setSegmentOptions([]);
                            }
                            setSegmentLoading(false);
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
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Purchase type</Text>
                  <RadioButton
                    label="One-time purchase"
                    checked={purchaseType === "one-time"}
                    onChange={() => setPurchaseType("one-time")}
                    name="purchaseType"
                  />
                  <RadioButton
                    label="Subscription"
                    checked={purchaseType === "subscription"}
                    onChange={() => setPurchaseType("subscription")}
                    name="purchaseType"
                  />
                  <RadioButton
                    label="Both"
                    checked={purchaseType === "both"}
                    onChange={() => setPurchaseType("both")}
                    name="purchaseType"
                  />
                </BlockStack>
              </Card>
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
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Free gift redemption</Text>
                  <Checkbox
                    label="Only apply free gift once per order"
                    checked={oneGiftPerOrder}
                    onChange={setOneGiftPerOrder}
                  />
                  <Text variant="bodySm" color="subdued">
                    If not selected, the free gift will be added with each eligible purchase amount and will be excluded from counting towards the purchase eligibility.
                  </Text>
                </BlockStack>
              </Card>
              <Card sectioned>
                <BlockStack gap="200">
                  <Text variant="headingMd">Active dates</Text>
                  <InlineStack gap="200">
                    <TextField
                      label="Start date"
                      value={startDate.toISOString().slice(0, 10)}
                      onChange={val => setStartDate(new Date(val))}
                      type="date"
                    />
                    <TextField
                      label="Start time (IST)"
                      value={startTime}
                      onChange={setStartTime}
                      type="time"
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
                        value={endDate.toISOString().slice(0, 10)}
                        onChange={val => setEndDate(new Date(val))}
                        type="date"
                      />
                      <TextField
                        label="End time (IST)"
                        value={endTime}
                        onChange={setEndTime}
                        type="time"
                      />
                    </InlineStack>
                  )}
                </BlockStack>
              </Card>
              <Button primary>Save</Button>
            </Layout.Section>
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
                    <Text>Gift with purchase</Text>
                    <Text variant="headingSm">Details</Text>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>For Online Store</li>
                      <li>Spend ₹{amount || '0.00'}, get 1 item free</li>
                      <li>For all customers</li>
                      <li>No usage limits</li>
                      <li>Applies to {purchaseType === 'one-time' ? 'one-time purchases' : purchaseType === 'subscription' ? 'subscriptions' : 'one-time & subscriptions'}</li>
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
