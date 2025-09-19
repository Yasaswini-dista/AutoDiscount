import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import * as Polaris from "@shopify/polaris";
import GiftWithPurchaseDiscount from "./GiftWithPurchaseDiscount";
import MultiValueDiscount from "./MultiValueDiscount";
import VolumeDiscount from "./VolumeDiscount";
import TierDiscount from "./TierDiscount";

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
  BlockStack,
  Box,
  Text,
  Icon,
} = Polaris;

// Loader to fetch customer segments from Shopify Admin API
export const loader = async ({ request }) => {
  const { json } = await import("@remix-run/node");
  const shopify = (await import("../shopify.server")).default;
  const { session } = await shopify.authenticate.admin(request);
  const { shop } = session;
  const accessToken = session?.accessToken;

  const SEGMENTS_AND_COUNTRIES_QUERY = `
    query {
      segments(first: 20) {
        edges {
          node {
            id
            name
            query
          }
        }
      }
      __type(name: "CountryCode") {
        enumValues {
          name
          description
        }
      }
    }
  `;

  try {
    const endpoint = `https://${shop}/admin/api/2025-07/graphql.json`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query: SEGMENTS_AND_COUNTRIES_QUERY }),
    });

    const data = await response.json();

    if (data.errors) {
      return json({ segments: [], countries: [], error: data.errors[0].message, shop });
    }

    const segments = data.data.segments.edges.map((edge) => ({
      id: edge.node.id,
      title: edge.node.name,
      query: edge.node.query,
    }));

    // Build country list from enumValues
    const countries = (data.data.__type?.enumValues || []).map((c) => ({
      code: c.name,
      name: c.description || c.name,
    }));

    return json({ segments, countries, error: null, shop });
  } catch (err) {
    return json({ segments: [], countries: [], error: err.message, shop });
  }
};

export default function DiscountsPage() {
  const { segments = [], countries = [], error, shop } = useLoaderData();

  const [active, setActive] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null); // track which subpage is open
  const [initialStartTime, setInitialStartTime] = useState("");

  const toggleModal = () => setActive(!active);

  // when user selects "Gift with purchase"
  const handleGiftWithPurchaseClick = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setInitialStartTime(timeStr);
    setSelectedPage("gift");
    setActive(false);
  };

  // when user selects "Multi-value discount"
  const handleMultiValueDiscountClick = () => {
    setSelectedPage("multi");
    setActive(false);
  };

  // you can add similar handlers for volume and tier
  const handleVolumeClick = () => {
    setSelectedPage("volume");
    setActive(false);
  };

  const handleTierClick = () => {
    setSelectedPage("tier");
    setActive(false);
  };

  // ----------------------------
  // RENDER SUB-PAGE IF SELECTED
  // ----------------------------
  if (selectedPage === "gift") {
    return (
      <GiftWithPurchaseDiscount
        onBack={() => setSelectedPage(null)}
        initialStartTime={initialStartTime}
        segments={segments}
        error={error}
        shopDomain={shop}
      />
    );
  }

  if (selectedPage === "multi") {
    return (
      <MultiValueDiscount
        onBack={() => setSelectedPage(null)}
        segments={segments}
        error={error}
        shopDomain={shop}
      />
    );
  }

  // Later you can replace alerts with <VolumeDiscount /> and <TierDiscount />
  if (selectedPage === "volume") {
    return (
      <VolumeDiscount
        onBack={() => setSelectedPage(null)}
        initialStartTime={initialStartTime}
        segments={segments}
        error={error}
        shopDomain={shop}
      />
    );
  }

  if (selectedPage === "tier") {
    return (
      <TierDiscount
        onBack={() => setSelectedPage(null)}
        initialStartTime={initialStartTime}
        segments={segments}
        error={error}
        shopDomain={shop}
        countries={countries}
      />
    );
  }

  // ----------------------------
  // DEFAULT MAIN PAGE
  // ----------------------------
  return (
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
                Multi-value discount — Multiple discount values
              </Button>
              <Button
                plain
                fullWidth
                icon={<Icon source={OrderIcon} />}
                onClick={handleVolumeClick}
              >
                Volume discount — Increase discount with quantity/amount
              </Button>
              <Button
                plain
                fullWidth
                icon={<Icon source={ProductIcon} />}
                onClick={handleTierClick}
              >
                Multi-class tier discount — Stack product/order/gift/shipping
                tiers
              </Button>
            </BlockStack>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
