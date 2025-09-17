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


export default function GiftWithPurchaseDiscount({ onBack, initialStartTime, segments = [], error, shopDomain }) {
  // Form state
  const [discountMethod, setDiscountMethod] = useState("code"); // "code" or "automatic"
  const [discountCode, setDiscountCode] = useState("");
  const [minType, setMinType] = useState("amount");
  // Default: amount is "" (zero rupees), quantity is 2 when selected
  const [amount, setAmount] = useState("");
  const [appliesTo, setAppliesTo] = useState("all");
  const [specificProducts, setSpecificProducts] = useState([]);
  const [specificCollections, setSpecificCollections] = useState([]);
  const [purchaseType, setPurchaseType] = useState("one-time");
  const [selectedGift, setSelectedGift] = useState(null);
  // Recurring payments for subscriptions state
  const [recurringOption, setRecurringOption] = useState('first'); // 'first', 'multiple', 'all'
  const [recurringCount, setRecurringCount] = useState('1');
  // const app = useAppBridge();
  // const pickerRef = useRef(null);

  const [eligibility, setEligibility] = useState("all");
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [segmentSearch, setSegmentSearch] = useState("");
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentOptions, setSegmentOptions] = useState(segments || []);
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
                      onChange={() => {
                        setMinType("amount");
                        setAmount(""); // reset to empty string for rupees
                      }}
                      name="minType"
                    />
                    <RadioButton
                      label="Minimum quantity of items"
                      checked={minType === "quantity"}
                      onChange={() => {
                        setMinType("quantity");
                        setAmount(a => (a === "" || isNaN(Number(a)) || Number(a) < 1) ? "2" : a);
                      }}
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
                      onChange={val => {
                        // Only allow numbers >= 1, default to 2 if empty
                        const num = parseInt(val, 10);
                        if (isNaN(num) || num < 1) {
                          setAmount("2");
                        } else {
                          setAmount(String(num));
                        }
                      }}
                      type="number"
                      min={1}
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
                            Select product
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
                            Select collection
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
                            const selected = await window.shopify.resourcePicker({
                              type: 'product',
                              multiple: false,
                              title: 'Select product',
                              selectButtonText: 'Select'
                            });
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
                            onClick={() => setShowSegmentModal(true)}
                          >
                            Browse
                          </Button>
                        </Box>
                      </Box>
                      {/* Modal for segment selection - new UI */}
                      <Polaris.Modal
                        open={showSegmentModal}
                        onClose={() => setShowSegmentModal(false)}
                        title="Add customer segments"
                        footerActionAlignment="right"
                        primaryAction={{
                          content: "Add",
                          onAction: () => setShowSegmentModal(false),
                        }}
                        secondaryActions={[
                          { content: "Close", onAction: () => setShowSegmentModal(false) }
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
                  {/* Customer segment browse modal (realtime) */}
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
                  {/* Recurring payments for subscriptions */}
                  {purchaseType === 'subscription' && (
                    <>
                      <Divider />
                      <Text variant="headingMd">Recurring payments for subscriptions</Text>
                      <BlockStack gap="100">
                        <RadioButton
                          label="Limit discount to first payment"
                          checked={recurringOption === 'first'}
                          onChange={() => setRecurringOption('first')}
                          name="recurringOption"
                        />
                        <RadioButton
                          label="Limit discount to multiple recurring payments"
                          checked={recurringOption === 'multiple'}
                          onChange={() => setRecurringOption('multiple')}
                          name="recurringOption"
                        />
                        {recurringOption === 'multiple' && (
                          <Box paddingInlineStart="6">
                            <TextField
                              label=""
                              value={recurringCount}
                              onChange={val => {
                                const num = parseInt(val, 10);
                                if (isNaN(num) || num < 1) {
                                  setRecurringCount('1');
                                } else {
                                  setRecurringCount(String(num));
                                }
                              }}
                              type="number"
                              min={1}
                              style={{ maxWidth: 80 }}
                            />
                            <Text color="subdued" variant="bodySm">Includes payment on first order.</Text>
                          </Box>
                        )}
                        <RadioButton
                          label="Discount applies to all recurring payments"
                          checked={recurringOption === 'all'}
                          onChange={() => setRecurringOption('all')}
                          name="recurringOption"
                        />
                      </BlockStack>
                    </>
                  )}
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
                      {(purchaseType === 'subscription' || purchaseType === 'both') && (
                        <>
                          <li>Applies to subscriptions{purchaseType === 'both' ? ' and one-time purchases' : ''}</li>
                          {recurringOption === 'first' && <li>For 1 recurring payment</li>}
                          {recurringOption === 'multiple' && <li>For {recurringCount} recurring payment{recurringCount === '1' ? '' : 's'}</li>}
                          {recurringOption === 'all' && <li>For all recurring payments</li>}
                        </>
                      )}
                      {purchaseType === 'one-time' && <li>Applies to one-time purchases</li>}
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
