import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import shopify from "../shopify.server";
// Loader to fetch customer segments from Shopify Admin API (server-side)
export const loader = async ({ request }) => {
  const { session } = await shopify.authenticate.admin(request);
  const { shop } = session;
  const accessToken = session?.accessToken;
  const SEGMENTS_QUERY = `
    query {
      segments(first: 50) {
        edges {
          node {
            id
            name
            query
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
  let segments = [];
  let error = null;
  try {
    const endpoint = `https://${shop}/admin/api/2025-07/graphql.json`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query: SEGMENTS_QUERY }),
    });
    const data = await response.json();
    if (data.errors) {
      error = data.errors[0].message;
    } else {
      segments = data.data.segments.edges.map(edge => ({
        id: edge.node.id,
        title: edge.node.name,
        query: edge.node.query,
      }));
    }
  } catch (err) {
    error = err.message;
  }
  return json({ segments, error });
};
import * as Polaris from "@shopify/polaris";
import GiftWithPurchaseDiscount from "./GiftWithPurchaseDiscount";
import MultiValueDiscount from "./MultiValueDiscount";
import { 
  GiftCardIcon, 
  DiscountIcon, 
  OrderIcon, 
  ProductIcon 
} from "@shopify/polaris-icons";

const {
  Page,
  Layout,
  Card,
  Button,
  Modal,
  TextContainer,
  InlineStack,
  BlockStack,
  Box,
  Text,
  Icon,
} = Polaris;

export default function DiscountsPage() {
  const { segments = [], error } = useLoaderData();
  const [active, setActive] = useState(false);


  // New state to show the GiftWithPurchaseDiscount or MultiValueDiscount UI
  const [showGiftWithPurchase, setShowGiftWithPurchase] = useState(false);
  const [showMultiValueDiscount, setShowMultiValueDiscount] = useState(false);
  const toggleModal = () => setActive(!active);

  // Handler for Gift with purchase button
  const [initialStartTime, setInitialStartTime] = useState("");
  const handleGiftWithPurchaseClick = () => {
    // Get current time in HH:MM format (24h, pad with 0)
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setInitialStartTime(timeStr);
    setShowGiftWithPurchase(true);
  };

  // Handler for Multi-value discount button
  const handleMultiValueDiscountClick = () => {
    setShowMultiValueDiscount(true);
  };

  return (
    <>
      {showGiftWithPurchase ? (
        <GiftWithPurchaseDiscount onBack={() => setShowGiftWithPurchase(false)} initialStartTime={initialStartTime} segments={segments} error={error} />
      ) : showMultiValueDiscount ? (
        <MultiValueDiscount onBack={() => setShowMultiValueDiscount(false)} initialStartTime={initialStartTime} segments={segments} error={error} />
      ) : (
        <Page title="Discount Functions">
          <Layout>
            <Layout.Section>
              <Card sectioned>
                <BlockStack alignment="center" spacing="loose">
                  <Box>
                    <Text variant="headingMd" as="h2">
                      Create your first discount function
                    </Text>
                    <Text as="p">
                      Build custom discount logic with powerful functions.
                    </Text>
                  </Box>
                  <Button primary onClick={toggleModal}>
                    Create discount function
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>

          <Modal
            open={active}
            onClose={toggleModal}
            title="Create discount function"
            primaryAction={{
              content: "Cancel",
              onAction: toggleModal,
            }}
          >
            <Modal.Section>
              <TextContainer>
                <BlockStack spacing="loose">
                  <Button
                    plain
                    fullWidth
                    icon={<Icon source={GiftCardIcon} />}
                    onClick={handleGiftWithPurchaseClick}
                  >
                    Gift with purchase — Automatically add free gift to cart
                  </Button>
                  <Button
                    plain
                    fullWidth
                    icon={<Icon source={DiscountIcon} />}
                    onClick={handleMultiValueDiscountClick}
                  >
                    Multi-value discount — Multiple discount values for products/collections
                  </Button>
                  <Button
                    plain
                    fullWidth
                    icon={<Icon source={OrderIcon} />}
                  >
                    Volume discount — Increase discount with quantity/amount
                  </Button>
                  <Button
                    plain
                    fullWidth
                    icon={<Icon source={ProductIcon} />}
                  >
                    Multi-class tier discount — Stack product/order/gift/shipping tiers
                  </Button>
                </BlockStack>
              </TextContainer>
            </Modal.Section>
          </Modal>
        </Page>
      )}
    </>
  );
}
