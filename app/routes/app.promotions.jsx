import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Card, Button, TextField, Box, Page, Layout, Modal, Checkbox, Spinner } from "@shopify/polaris";

// Loader to fetch available discounts using Shopify GraphQL Admin API
export const loader = async ({ request }) => {
    const shopify = (await import("../shopify.server")).default;
    const { session } = await shopify.authenticate.admin(request);
    const { shop } = session;
    const accessToken = session?.accessToken;

        // GraphQL query for all discount types, always requesting title and type
        const query = `
        {
            discountNodes(first: 80, query: "status:active") {
                edges {
                    node {
                        id
                        discount {
                            __typename
                            ... on DiscountCodeBasic { title status }
                            ... on DiscountCodeBxgy { title status }
                            ... on DiscountCodeApp { title status }
                            ... on DiscountCodeFreeShipping { title status }
                            ... on DiscountAutomaticBasic { title status }
                            ... on DiscountAutomaticBxgy { title status }
                            ... on DiscountAutomaticFreeShipping { title status }
                            ... on DiscountAutomaticApp { title status }
                        }
                    }
                }
            }
        }
        `;

    const endpoint = `https://${shop}/admin/api/2025-07/graphql.json`;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query }),
    });
    const data = await response.json();
    console.log("Fetched discounts:", data);
    const discounts =
        data?.data?.discountNodes?.edges
            ?.map((edge) => {
                const discount = edge.node.discount;
                if (!discount) return null;
                // Use only the title as label, matching Shopify admin
                const label = discount.title || edge.node.id;
                // Human-friendly type
                let typeLabel = '';
                switch (discount.__typename) {
                  case 'DiscountCodeBasic': typeLabel = 'Amount off order'; break;
                  case 'DiscountCodeBxgy': typeLabel = 'Buy X Get Y'; break;
                  case 'DiscountCodeApp': typeLabel = 'App Discount'; break;
                  case 'DiscountCodeFreeShipping': typeLabel = 'Free Shipping'; break;
                  case 'DiscountAutomaticBasic': typeLabel = 'Automatic'; break;
                  case 'DiscountAutomaticBxgy': typeLabel = 'Automatic BXGY'; break;
                  case 'DiscountAutomaticFreeShipping': typeLabel = 'Automatic Free Shipping'; break;
                  case 'DiscountAutomaticApp': typeLabel = 'Automatic App Discount'; break;
                  default: typeLabel = discount.__typename; break;
                }
                return {
                    label,
                    value: edge.node.id,
                    type: typeLabel,
                    status: discount.status,
                };
            })
            .filter(Boolean) || [];
    return json({ discounts });
};

export default function CreatePromotion() {
    const { discounts } = useLoaderData();
    const [showForm, setShowForm] = useState(false);
    const [promotionTitle, setPromotionTitle] = useState("");
    const [selectedDiscount, setSelectedDiscount] = useState("");
    const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);
    const [modalSelectedDiscount, setModalSelectedDiscount] = useState("");

    // Find selected discount label for display
    const selectedDiscountObj = discounts.find(d => d.value === selectedDiscount);
    // Find modal selected discount label for display
    const modalSelectedDiscountObj = discounts.find(d => d.value === modalSelectedDiscount);

    return (
        <Page title="Create promotion">
            <Layout>
                <Layout.Section>
                    {!showForm ? (
                        <Box padding="8" display="flex" flexDirection="column" alignItems="center">
                            <img
                                src="https://cdn.shopify.com/shopifycloud/web/assets/v1/hand-phone.svg"
                                alt="Create promotion"
                                style={{ width: 120, marginBottom: 24 }}
                            />
                            <h2 style={{ fontWeight: 600, fontSize: 22, marginBottom: 8 }}>
                                Create your first promotion
                            </h2>
                            <p style={{ marginBottom: 24 }}>
                                Launch promotions that your customers see and understand.
                            </p>
                            <Button primary onClick={() => setShowForm(true)}>
                                Create promotion
                            </Button>
                        </Box>
                    ) : (
                        <Card sectioned>
                            <Box paddingBlockEnd="4">
                                <TextField
                                    label="Promotion title"
                                    placeholder="Enter a title for your promotion"
                                    value={promotionTitle}
                                    onChange={setPromotionTitle}
                                    autoComplete="off"
                                />
                            </Box>
                            <Box paddingBlockEnd="4">
                                <div style={{ border: '1px dashed #babfc3', borderRadius: 8, padding: 24, background: '#fcfcfc', minHeight: 80 }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 32 }}>
                                        {!selectedDiscountObj ? (
                                            <Button onClick={() => {
                                                setModalSelectedDiscount(selectedDiscount);
                                                setShowDiscountDropdown(true);
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
                                                    setShowDiscountDropdown(true);
                                                }}>
                                                    Change
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <Modal
                                        open={showDiscountDropdown}
                                        onClose={() => setShowDiscountDropdown(false)}
                                        title="Select a discount"
                                        primaryAction={{
                                            content: 'Save',
                                            onAction: () => {
                                                setSelectedDiscount(modalSelectedDiscount);
                                                setShowDiscountDropdown(false);
                                            },
                                            disabled: !modalSelectedDiscount
                                        }}
                                        secondaryActions={[{ content: 'Cancel', onAction: () => setShowDiscountDropdown(false) }]}
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
                            </Box>
                            <Button primary disabled={!promotionTitle || !selectedDiscount}>
                                Save promotion
                            </Button>
                        </Card>
                    )}
                </Layout.Section>
            </Layout>
        </Page>
    );
}