import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
// Action to receive discount form data from child components
export const action = async ({ request }) => {
  const formData = await request.formData();
  // Convert FormData to object
  const data = {};
  for (const [key, value] of formData.entries()) {
    try {
      data[key] = JSON.parse(value);
    } catch {
      data[key] = value;
    }
  }

  // Accept both 'multi-value', 'multi-value-discount', 'volume-discount', and 'tier-discount' as intent
  const intent = data.intent || data.discountType;
  let payload = data.payload || data;

  // Handle Tier Discount
  if (intent === "tier-discount") {
    // Get Shopify session
    const shopify = (await import("../shopify.server")).default;
    const { session } = await shopify.authenticate.admin(request);
    const { shop } = session;
    const accessToken = session?.accessToken;

    // Map form data to Shopify API input
    const code = payload.discountCode;
    // Use autoTitle for automatic, code for code-based, fallback to default
    let title = "Tier Discount";
    if (payload.discountMethod === "automatic") {
      title = payload.autoTitle || "Tier Discount";
    } else {
      title = code || "Tier Discount";
    }
    const startsAt = payload.startDate ? `${payload.startDate}` : null;

    // Determine discount classes from combos and tiers
    let discountClasses = [];
    if (payload.combos) {
      if (payload.combos.product) discountClasses.push("PRODUCT");
      if (payload.combos.order) discountClasses.push("ORDER");
      if (payload.combos.shipping) discountClasses.push("SHIPPING");
      if (payload.combos.gift) discountClasses.push("GIFT");
    }
    // Fallback: infer from tiers if combos not set
    if (discountClasses.length === 0 && Array.isArray(payload.tiers)) {
      for (const tier of payload.tiers) {
        if (Array.isArray(tier.discounts)) {
          for (const d of tier.discounts) {
            if (d.type === "product" && !discountClasses.includes("PRODUCT")) discountClasses.push("PRODUCT");
            if (d.type === "order" && !discountClasses.includes("ORDER")) discountClasses.push("ORDER");
            if (d.type === "shipping" && !discountClasses.includes("SHIPPING")) discountClasses.push("SHIPPING");
            if (d.type === "gift" && !discountClasses.includes("GIFT")) discountClasses.push("GIFT");
          }
        }
      }
    }
    if (discountClasses.length === 0) discountClasses = ["PRODUCT"];

    // Build function config for metafield
    // Pass all tiers and their discounts
    const functionConfig = {
      tiers: payload.tiers || [],
      appliesTo: payload.appliesTo,
      purchaseType: payload.purchaseType,
      minType: payload.minType,
      eligibility: payload.eligibility,
      selectedSegments: payload.selectedSegments,
      combos: payload.combos,
      maxUses: payload.maxUses,
      maxUsesPerCustomer: payload.maxUsesPerCustomer,
      startDate: payload.startDate,
      startTime: payload.startTime,
      hasEndDate: payload.hasEndDate,
      endDate: payload.endDate,
      endTime: payload.endTime,
      specificProducts: payload.specificProducts,
      specificCollections: payload.specificCollections,
      // Add any other fields needed for function logic
    };
    const baseDiscountInput = {
      title,
      startsAt,
      functionId: "019960b1-ae92-72ec-b72d-744e81978e00",
      discountClasses,
      metafields: [
        {
          namespace: "function-configuration",
          key: "config",
          type: "json",
          value: JSON.stringify(functionConfig),
        },
      ],
    };

    let mutation, variables;
    if (payload.discountMethod === "automatic") {
      // Automatic discount (no code)
      mutation = `
        mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
          discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
            userErrors { field message }
            automaticAppDiscount { discountId }
          }
        }
      `;
      variables = { automaticAppDiscount: baseDiscountInput };
      console.log('Sending automaticAppDiscount:', JSON.stringify(baseDiscountInput, null, 2));
    } else {
      // Code-based discount (default)
      mutation = `
        mutation discountCodeAppCreate($codeAppDiscount: DiscountCodeAppInput!) {
          discountCodeAppCreate(codeAppDiscount: $codeAppDiscount) {
            userErrors { field message }
            codeAppDiscount { discountId }
          }
        }
      `;
      variables = { codeAppDiscount: { ...baseDiscountInput, code } };
    }

    // Call Shopify Admin API
    const endpoint = `https://${shop}/admin/api/2025-07/graphql.json`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    });
    const result = await response.json();
    console.log("Shopify API response:", JSON.stringify(result, null, 2));
    const userErrors = payload.discountMethod === "automatic"
      ? result.data?.discountAutomaticAppCreate?.userErrors
      : result.data?.discountCodeAppCreate?.userErrors;
    if (result.errors || (userErrors && userErrors.length)) {
      console.error("Shopify API error:", result.errors || userErrors);
      return json({ ok: false, errors: result.errors || userErrors });
    }
    const discount = payload.discountMethod === "automatic"
      ? result.data.discountAutomaticAppCreate.automaticAppDiscount
      : result.data.discountCodeAppCreate.codeAppDiscount;

    return json({ ok: true, discount });
  }

  // Handle Volume Discount
  if (intent === "volume-discount") {
    // Get Shopify session
    const shopify = (await import("../shopify.server")).default;
    const { session } = await shopify.authenticate.admin(request);
    const { shop } = session;
    const accessToken = session?.accessToken;

    // Map form data to Shopify API input
    const code = payload.discountCode;
    // Use autoTitle for automatic, code for code-based, fallback to default
    let title = "Volume Discount";
    if (payload.discountMethod === "automatic") {
      title = payload.autoTitle || "Volume Discount";
    } else {
      title = code || "Volume Discount";
    }
    const startsAt = payload.startDate ? `${payload.startDate}` : null;
    // For functionId, use the provided function ID
    // For discountClasses, map combos to [PRODUCT, ORDER, SHIPPING]
    let discountClasses = [];
    if (payload.combos) {
      if (payload.combos.product) discountClasses.push("PRODUCT");
      if (payload.combos.order) discountClasses.push("ORDER");
      if (payload.combos.shipping) discountClasses.push("SHIPPING");
    }
    if (discountClasses.length === 0) discountClasses = ["PRODUCT"];

    // Build input for mutation
    // Add all custom fields as a metafield for the function
    let discountType = undefined;
    if (Array.isArray(payload.tierValues) && payload.tierValues.length > 0) {
      // Use the type from the first tier
      discountType = payload.discountType || payload.tierValues[0].type;
    }
    // Build discountValues array for function config
    let discountValues = [];
    if (Array.isArray(payload.tierValues)) {
      discountValues = payload.tierValues.map(tier => {
        if (payload.minType === "amount") {
          return {
            minAmount: tier.minAmount,
            type: payload.discountType,
            value: payload.discountType === "percentage" ? tier.percent : tier.amount
          };
        } else {
          return {
            minQty: tier.minQty,
            type: payload.discountType,
            value: payload.discountType === "percentage" ? tier.percent : tier.amount
          };
        }
      });
    }
    const functionConfig = {
      appliesTo: payload.appliesTo,
      purchaseType: payload.purchaseType,
      discountValues,
      discountType: payload.discountType,
      minType: payload.minType,
      minPerVariant: payload.minPerVariant,
      eligibility: payload.eligibility,
      selectedSegments: payload.selectedSegments,
      combos: payload.combos,
      maxUses: payload.maxUses,
      maxUsesPerCustomer: payload.maxUsesPerCustomer,
      startDate: payload.startDate,
      startTime: payload.startTime,
      hasEndDate: payload.hasEndDate,
      endDate: payload.endDate,
      endTime: payload.endTime,
    };
    const baseDiscountInput = {
      title,
      startsAt,
      functionId: "019960b1-ae92-72ec-b72d-744e81978e00",
      discountClasses,
      metafields: [
        {
          namespace: "function-configuration",
          key: "config",
          type: "json",
          value: JSON.stringify(functionConfig),
        },
      ],
    };

    let mutation, variables;
    if (payload.discountMethod === "automatic") {
      // Automatic discount (no code)
      mutation = `
        mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
          discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
            userErrors { field message }
            automaticAppDiscount { discountId }
          }
        }
      `;
      variables = { automaticAppDiscount: baseDiscountInput };
      console.log('Sending automaticAppDiscount:', JSON.stringify(baseDiscountInput, null, 2));
    } else {
      // Code-based discount (default)
      mutation = `
        mutation discountCodeAppCreate($codeAppDiscount: DiscountCodeAppInput!) {
          discountCodeAppCreate(codeAppDiscount: $codeAppDiscount) {
            userErrors { field message }
            codeAppDiscount { discountId }
          }
        }
      `;
      variables = { codeAppDiscount: { ...baseDiscountInput, code } };
    }

    // Call Shopify Admin API
    const endpoint = `https://${shop}/admin/api/2025-07/graphql.json`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    });
    const result = await response.json();
    console.log("Shopify API response:", JSON.stringify(result, null, 2));
    const userErrors = payload.discountMethod === "automatic"
      ? result.data?.discountAutomaticAppCreate?.userErrors
      : result.data?.discountCodeAppCreate?.userErrors;
    if (result.errors || (userErrors && userErrors.length)) {
      console.error("Shopify API error:", result.errors || userErrors);
      return json({ ok: false, errors: result.errors || userErrors });
    }
    const discount = payload.discountMethod === "automatic"
      ? result.data.discountAutomaticAppCreate.automaticAppDiscount
      : result.data.discountCodeAppCreate.codeAppDiscount;

    return json({ ok: true, discount });
  } else if (intent === "multi-value" || intent === "multi-value-discount") {
    // Get Shopify session
    const shopify = (await import("../shopify.server")).default;
    const { session } = await shopify.authenticate.admin(request);
    const { shop } = session;
    const accessToken = session?.accessToken;

    // Map form data to Shopify API input
    const code = payload.discountCode;
    // Use autoTitle for automatic, code for code-based, fallback to default
    let title = "Multi Value Discount";
    if (payload.discountMethod === "automatic") {
      title = payload.autoTitle || "Multi Value Discount";
    } else {
      title = code || "Multi Value Discount";
    }
    const startsAt = payload.startDate ? `${payload.startDate}` : null;
    // For functionId, use the provided function ID
    // For discountClasses, you may want to map combos to [PRODUCT, ORDER, SHIPPING]
    let discountClasses = [];
    if (payload.combos) {
      if (payload.combos.product) discountClasses.push("PRODUCT");
      if (payload.combos.order) discountClasses.push("ORDER");
      if (payload.combos.shipping) discountClasses.push("SHIPPING");
    }
    if (discountClasses.length === 0) discountClasses = ["PRODUCT"];

    // Build input for mutation
    // Add all custom fields as a metafield for the function
    let discountType = undefined;
    if (Array.isArray(payload.discountValues) && payload.discountValues.length > 0) {
      discountType = payload.discountValues[0].type;
    }
    const functionConfig = {
      appliesTo: payload.appliesTo,
      recurringOption: payload.recurringOption,
      recurringCount: payload.recurringCount,
      purchaseType: payload.purchaseType,
      discountValues: payload.discountValues,
      eligibility: payload.eligibility,
      selectedSegments: payload.selectedSegments,
      combos: payload.combos,
      maxUses: payload.maxUses,
      maxUsesPerCustomer: payload.maxUsesPerCustomer,
      startDate: payload.startDate,
      startTime: payload.startTime,
      hasEndDate: payload.hasEndDate,
      endDate: payload.endDate,
      endTime: payload.endTime,
      ...(discountType && { discountType }),
    };
    const baseDiscountInput = {
      title,
      startsAt,
      functionId: "019960b1-ae92-72ec-b72d-744e81978e00",
      discountClasses,
      metafields: [
        {
          namespace: "function-configuration",
          key: "config",
          type: "json",
          value: JSON.stringify(functionConfig),
        },
      ],
    };

    let mutation, variables;
    if (payload.discountMethod === "automatic") {
      // Automatic discount (no code)
      mutation = `
        mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
          discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
            userErrors { field message }
            automaticAppDiscount { discountId }
          }
        }
      `;
      variables = { automaticAppDiscount: baseDiscountInput };
      console.log('Sending automaticAppDiscount:', JSON.stringify(baseDiscountInput, null, 2));
    } else {
      // Code-based discount (default)
      mutation = `
        mutation discountCodeAppCreate($codeAppDiscount: DiscountCodeAppInput!) {
          discountCodeAppCreate(codeAppDiscount: $codeAppDiscount) {
            userErrors { field message }
            codeAppDiscount { discountId }
          }
        }
      `;
      variables = { codeAppDiscount: { ...baseDiscountInput, code } };
    }

    // Call Shopify Admin API
    const endpoint = `https://${shop}/admin/api/2025-07/graphql.json`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    });
    const result = await response.json();
    console.log("Shopify API response:", JSON.stringify(result, null, 2));
    const userErrors = payload.discountMethod === "automatic"
      ? result.data?.discountAutomaticAppCreate?.userErrors
      : result.data?.discountCodeAppCreate?.userErrors;
    if (result.errors || (userErrors && userErrors.length)) {
      console.error("Shopify API error:", result.errors || userErrors);
      return json({ ok: false, errors: result.errors || userErrors });
    }
    const discount = payload.discountMethod === "automatic"
      ? result.data.discountAutomaticAppCreate.automaticAppDiscount
      : result.data.discountCodeAppCreate.codeAppDiscount;
    return json({ ok: true, discount });
  }

  return json({ ok: true });
};
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

  // Query to fetch discounts by functionId (app-specific)
  const FUNCTION_ID = "019960b1-ae92-72ec-b72d-744e81978e00";
  const discounts_query = `
    query {
      discountNodes(first: 50, query: \"functionId:${FUNCTION_ID} status:active\") {
        edges {
          node {
            id
            discount {
              __typename
              ... on DiscountCodeApp { title status }
              ... on DiscountAutomaticApp { title status }
              ... on DiscountCodeBasic { title status }
              ... on DiscountCodeBxgy { title status }
              ... on DiscountCodeFreeShipping { title status }
              ... on DiscountAutomaticBasic { title status }
              ... on DiscountAutomaticBxgy { title status }
              ... on DiscountAutomaticFreeShipping { title status }
            }
          }
        }
      }
    }
  `;

  try {
    const endpoint = `https://${shop}/admin/api/2025-07/graphql.json`;
    // Fetch segments and countries
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

    console.log('segments',segments);

    // Fetch discounts created by this app
    const discRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query: discounts_query }),
    });
    const discData = await discRes.json();
    // Only include app discounts (DiscountCodeApp or DiscountAutomaticApp)
    const discounts = (discData.data.discountNodes.edges || [])
      .map(edge => ({
        id: edge.node.id,
        ...edge.node.discount,
      }))
      .filter(d => d.__typename === "DiscountCodeApp" || d.__typename === "DiscountAutomaticApp");

    console.log("[DISCOUNTS LOADER] App discounts by functionId:", JSON.stringify(discounts, null, 2));

    return json({ segments, countries, discounts, error: null, shop });
  } catch (err) {
    return json({ segments: [], countries: [], discounts: [], error: err.message, shop });
  }
};

export default function DiscountsPage() {

  const { segments = [], countries = [], discounts = [], error, shop } = useLoaderData();

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

  // Filter only discounts created by app (DiscountCodeApp or DiscountAutomaticApp)
  const appDiscounts = discounts.filter(d => d.__typename === "DiscountCodeApp" || d.__typename === "DiscountAutomaticApp");

  // Table columns: Title, Status, Method, Type, Combinations, Used
  const tableRows = appDiscounts.map(d => [
    <span style={{ fontWeight: 600 }}>{d.title}</span>,
    d.status === 'ACTIVE' ? <span style={{ background: '#d1fadf', color: '#067942', borderRadius: 8, padding: '2px 12px', fontWeight: 500 }}>Active</span> : d.status,
    d.__typename === 'DiscountCodeApp' ? 'Code' : 'Automatic',
    <span><svg style={{verticalAlign:'middle',marginRight:4}} width="16" height="16" viewBox="0 0 16 16"><path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 2h-9ZM3 3.5A.5.5 0 0 1 3.5 3h9a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9ZM8 5.5A2.5 2.5 0 1 0 8 10.5a2.5 2.5 0 0 0 0-5Z" fill="#212b36"/></svg>Multi-value discount</span>,
    <span style={{color:'#b3b3b3'}}>
      <svg width="18" height="18" style={{marginRight:4,verticalAlign:'middle'}}><circle cx="9" cy="9" r="7" stroke="#b3b3b3" strokeWidth="2" fill="none"/></svg>
      <svg width="18" height="18" style={{marginRight:4,verticalAlign:'middle'}}><rect x="3" y="3" width="12" height="12" stroke="#b3b3b3" strokeWidth="2" fill="none"/></svg>
      <svg width="18" height="18" style={{marginRight:4,verticalAlign:'middle'}}><rect x="3" y="7" width="12" height="4" stroke="#b3b3b3" strokeWidth="2" fill="none"/></svg>
    </span>,
    0 // Used (hardcoded as 0 for now)
  ]);

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
        parentAction="/app/discounts" // pass action URL
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
  // DEFAULT MAIN PAGE: Show discounts table and create button
  // ----------------------------
  return (
    <Page title="Discount Functions">
      <Layout>
        <Layout.Section>
          {/* Discount list table */}
          <Card>
            <Polaris.DataTable
              columnContentTypes={['text', 'text', 'text', 'text', 'text', 'numeric']}
              headings={['Discount function title', 'Status', 'Method', 'Type', 'Combinations', 'Used']}
              rows={tableRows}
            />
          </Card>
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