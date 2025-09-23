import React, { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useMatches } from "@remix-run/react";
import { Card, Button, TextField, Box, Page, Layout, Modal, Checkbox } from "@shopify/polaris";

// Loader for new promotion page (reuse discounts from parent loader)
export const loader = async ({ request }) => {
  // This loader is not needed if parent already loads discounts
  return json({});
};

// Action to save new promotion
export const action = async ({ request }) => {
  const formData = await request.formData();
  const title = formData.get("promotionTitle");
  const discountId = formData.get("discountId");
  // Here you would save to your DB or Shopify metafield, etc.
  // For now, just mock an ID
  const newPromotionId = crypto.randomUUID();
  // TODO: Save promotion to DB
  return redirect(`/app/promotions/${newPromotionId}`);
};



export default function NewPromotion() {
  const fetcher = useFetcher();
  // Get discounts from parent loader (promotions page) using useMatches
  const matches = useMatches();
  const parentData = matches.find(m => m.id && m.id.endsWith("app.promotions"))?.data;
  const discounts = parentData?.discounts || [];
  const [promotionTitle, setPromotionTitle] = useState("");
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState("");
  const [modalSelectedDiscount, setModalSelectedDiscount] = useState("");
  const [useActiveDates, setUseActiveDates] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);

  // Find selected discount label for display
  const selectedDiscountObj = discounts.find(d => d.value === selectedDiscount);

  // If a discount is selected and the title is empty, set the title to the discount label
  React.useEffect(() => {
    if (selectedDiscountObj && !promotionTitle) {
      setPromotionTitle(selectedDiscountObj.label);
    }
  }, [selectedDiscountObj]);

  return (
    <Page title="Create promotion">
      <Layout>
        <Layout.Section oneHalf>
          <fetcher.Form method="post">
            {/* Promotion title card */}
            <Card sectioned>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Promotion title</div>
                <span
                  style={{ color: '#babfc3', fontSize: 18, cursor: 'pointer' }}
                  title="Edit"
                  onClick={() => setEditingTitle(true)}
                >✎</span>
              </div>
              <div style={{ color: '#6d7175', fontSize: 14, marginBottom: 8 }}>
                Add a discount to set a default promotion title. You can customize this after.
              </div>
              {editingTitle && (
                <TextField
                  label=""
                  placeholder="Enter a title for your promotion"
                  value={promotionTitle}
                  onChange={setPromotionTitle}
                  name="promotionTitle"
                  autoComplete="off"
                  showClearButton
                  clearButtonLabel="Clear"
                  style={{ maxWidth: 400 }}
                  onBlur={() => setEditingTitle(false)}
                  autoFocus
                />
              )}
              {!editingTitle && (
                <div
                  style={{
                    minHeight: 40,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 15,
                    color: '#232323',
                    cursor: 'pointer',
                  }}
                  onClick={() => setEditingTitle(true)}
                  tabIndex={0}
                >
                  {promotionTitle || <span style={{ color: '#babfc3' }}>Enter a title for your promotion</span>}
                </div>
              )}
            </Card>
            {/* Discount selector card */}
            <Card sectioned>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Discount</div>
              <div style={{ border: '1px dashed #babfc3', borderRadius: 8, padding: 24, background: '#fcfcfc', minHeight: 80 }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 32 }}>
                  {!selectedDiscountObj ? (
                    <Button onClick={() => {
                      setModalSelectedDiscount(selectedDiscount);
                      setShowDiscountModal(true);
                    }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>+ Add discount</span>
                    </Button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{selectedDiscountObj.label}</span>
                        <span style={{ color: '#6d7175', fontSize: 13, marginLeft: 8 }}>({selectedDiscountObj.type})</span>
                      </div>
                      <Button plain onClick={() => {
                        setModalSelectedDiscount(selectedDiscount);
                        setShowDiscountModal(true);
                      }}>
                        Change
                      </Button>
                    </div>
                  )}
                </div>
                {/* Modal for selecting discount */}
                <Modal
                  open={showDiscountModal}
                  onClose={() => setShowDiscountModal(false)}
                  title="Select a discount"
                  primaryAction={{
                    content: 'Save',
                    onAction: () => {
                      setSelectedDiscount(modalSelectedDiscount);
                      setShowDiscountModal(false);
                    },
                    disabled: !modalSelectedDiscount
                  }}
                  secondaryActions={[{ content: 'Cancel', onAction: () => setShowDiscountModal(false) }]}
                  large
                >
                  <Modal.Section>
                    <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                      {discounts.length ? discounts.map((discount) => (
                        <div key={discount.value} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f4f6f8' }}>
                          <Checkbox
                            checked={modalSelectedDiscount === discount.value}
                            onChange={() => setModalSelectedDiscount(discount.value)}
                            label={
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>{discount.label} <span style={{ color: '#008060', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>{discount.status === 'ACTIVE' ? 'Active' : discount.status}</span></span>
                                <span style={{ fontSize: 13, color: '#6d7175' }}>{discount.type}</span>
                              </div>
                            }
                            disabled={false}
                          />
                        </div>
                      )) : (
                        <div style={{ color: '#999' }}>No discounts found</div>
                      )}
                    </div>
                  </Modal.Section>
                </Modal>
              </div>
            </Card>
            {/* Hidden field for selected discount */}
            <input type="hidden" name="discountId" value={selectedDiscount} />
            <Button primary submit disabled={!promotionTitle || !selectedDiscount} style={{ marginTop: 24 }}>
              Save promotion
            </Button>
          </fetcher.Form>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          {/* Active Dates checkbox */}
          <Card sectioned>
            <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: 12 }}>
              <Checkbox
                label={<span style={{ fontWeight: 600 }}>Use discount's start and end dates</span>}
                checked={useActiveDates}
                onChange={setUseActiveDates}
              />
              <div style={{ color: '#6d7175', fontSize: 13, marginTop: 2 }}>
                For multiple discounts, the start date is set from the earliest active discount, and the end date from the latest expiring discount.
              </div>
            </div>
          </Card>
          {/* Discount summary card */}
          <Card title={selectedDiscountObj ? selectedDiscountObj.label : 'No discount added'} sectioned>
            {selectedDiscountObj ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{selectedDiscountObj.label}</span>
                  {selectedDiscountObj.status === 'ACTIVE' && (
                    <span style={{ background: '#d0f5e6', color: '#008060', borderRadius: 6, fontSize: 13, padding: '2px 8px', marginLeft: 4 }}>Active</span>
                  )}
                </div>
                <div style={{ color: '#6d7175', fontSize: 13, marginBottom: 8 }}>{selectedDiscountObj.type}</div>
                <div style={{ color: '#232323', fontSize: 14, marginBottom: 4 }}>Details</div>
                <ul style={{ color: '#232323', fontSize: 13, margin: 0, paddingLeft: 18 }}>
                  <li>For Online Store</li>
                  <li>No usage limits</li>
                </ul>
              </>
            ) : (
              <>
                <div style={{ color: '#232323', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>No discount added</div>
                <div style={{ color: '#999', fontSize: 14 }}>Discount summary will show here</div>
              </>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
