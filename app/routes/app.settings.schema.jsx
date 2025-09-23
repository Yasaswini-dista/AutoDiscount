import React, { useState } from "react";
import { Page, Layout, Card, Text, Link, BlockStack, InlineStack, Button, Box, Checkbox, TextField, Banner } from "@shopify/polaris";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useSearchParams } from "@remix-run/react";


const defaultJson = `{
  "schema": {
    "all": {
      "collection-product-price": {
        "html": "<div class=\"price price--on-sale\"><div class=\"price__container\"><div class=\"price__sale\"><span class=\"visually-hidden\">Sale price</span><span class=\"price-item price-item--sale\">{{ product.price | money }}</span></div></div></div>",
        "type": "product",
        "selector": ".product-grid .grid__item .price",
        "container": ".product-grid .grid__item"
      }
    },
    "product": {
      "product-price": {
        "html": "<div class=\"price price--large price--on-sale\"><div class=\"price__container\"><div class=\"price__sale\"><span class=\"visually-hidden\">Sale price</span><span class=\"price-item price-item--sale\">{{ product.price | money }}</span></div></div></div>",
        "type": "product",
        "selector": ".product .price"
      }
    }
  }
}`;

// --- Loader to fetch JSON schema for this shop ---
export const loader = async ({ request }) => {
  const shopify = (await import("../shopify.server")).default;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const { session } = await shopify.authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const themeId = url.searchParams.get("themeId") || "";
  let record = await prisma.themeSettings.findFirst({ where: { shop } });
  let jsonSchema = record?.jsonSchema || defaultJson;
  return json({ jsonSchema, themeId });
};

// --- Action to save JSON schema for this shop ---
export const action = async ({ request }) => {
  const shopify = (await import("../shopify.server")).default;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const { session, admin } = await shopify.authenticate.admin(request);
  const shop = session.shop;
  const accessToken = session.accessToken;
  const form = await request.formData();
  const jsonSchema = form.get("jsonSchema");
  const themeId = form.get("themeId") || "";
  // Find existing record by shop
  const existing = await prisma.themeSettings.findFirst({ where: { shop } });
  if (existing) {
    await prisma.themeSettings.update({
      where: { id: existing.id },
      data: { jsonSchema, themeId },
    });
    console.log("Updated themeSettings for shop:", shop, "themeId:", themeId);
  } else {
    await prisma.themeSettings.create({
      data: { shop, themeId, jsonSchema },
    });
    console.log("Created new themeSettings for shop:", shop, "themeId:", themeId);
  }

  // Upload JSON as asset to selected theme using direct REST API call (PUT, Accept header, debug logs)
  if (themeId && jsonSchema) {
    const shopDomain = shop;
    // Extract numeric theme ID from GID if needed
    let numericThemeId = themeId;
    const match = /\/(\d+)$/.exec(themeId);
    if (match) {
      numericThemeId = match[1];
    }

    const url = `https://${shopDomain}/admin/api/2023-10/themes/${numericThemeId}/assets.json`;
    const assetBody = {
      asset: {
        key: "assets/auto-discount-pricing-schema.json",
        value: typeof jsonSchema === 'string' ? jsonSchema : JSON.stringify(jsonSchema),
      },
    };
    console.log("Uploading asset to Shopify:", JSON.stringify(assetBody), "Theme ID used:", numericThemeId);
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(assetBody),
    });
    const responseText = await response.text();
    if (response.ok) {
      console.log("Asset uploaded successfully to theme:", numericThemeId, responseText);
    } else {
      console.error("Asset upload failed:", response.status, responseText);
    }
  }

  return redirect(`/app/settings/schema?themeId=${themeId}`);
};


export default function EditJsonSchema() {
  const { jsonSchema, themeId } = useLoaderData();
  const [hideTrailingZeros, setHideTrailingZeros] = useState(false);
  const [autoAddGift, setAutoAddGift] = useState(true);
  const [jsonValue, setJsonValue] = useState(jsonSchema);
  const submit = useSubmit();
  const [searchParams] = useSearchParams();
  const currentThemeId = themeId || searchParams.get("themeId") || "";

  function handleSave() {
    const form = new FormData();
    form.append("jsonSchema", jsonValue);
    form.append("themeId", currentThemeId);
    submit(form, { method: "post" });
  }

  return (
    <Page title="Edit JSON file" backAction={{ content: "Settings", url: "/app/settings" }}>
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <BlockStack gap="loose">
              <Text variant="headingMd">Dynamic pricing JSON schema</Text>
              <Text>
                You can use liquid variables to customize your schema.{' '}
                <Link url="https://shopify.dev/docs/api/liquid" external>Learn more about liquid variables.</Link>
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card sectioned>
            <BlockStack gap="loose">
              <Text variant="headingMd">Price formatting</Text>
              <Checkbox
                label="Hide trailing zeros"
                checked={hideTrailingZeros}
                onChange={setHideTrailingZeros}
                helpText="When there are trailing zeros for the product price ($100.00), hiding trailing zeros will display prices as $100."
              />
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card sectioned>
            <BlockStack gap="loose">
              <Text variant="headingMd">Gift with purchase cart behaviour</Text>
              <Checkbox
                label="Automatically add free gift to cart once per customer session"
                checked={autoAddGift}
                onChange={setAutoAddGift}
                helpText="If the customer removes the free gift from cart, it will not be added again."
              />
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Banner status="info">
            We recommend only developers edit this area. <Link url="#" external>Contact us</Link> for help with setting up your pricing configuration.
          </Banner>
        </Layout.Section>
        <Layout.Section>
          <Card sectioned>
            <TextField
              label=""
              value={jsonValue}
              onChange={setJsonValue}
              multiline={20}
              autoComplete="off"
              helpText={<span>You can see examples of schemas at <Link url="https://github.com/your-github-repo" external>our GitHub repo</Link>.</span>}
            />
            <Box display="flex" justifyContent="end" marginTop="4">
              <Button onClick={() => setJsonValue(defaultJson)}>Revert to default</Button>
              <Button primary onClick={handleSave}>Save</Button>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
