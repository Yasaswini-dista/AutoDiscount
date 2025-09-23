
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import { useSubmit } from "@remix-run/react";


export const loader = async ({ request }) => {
  const shopify = (await import("../shopify.server")).default;
  const { admin } = await shopify.authenticate.admin(request);
  // Fetch all themes
  const response = await admin.graphql(`#graphql\n    query {\n      themes(first: 20) {\n        edges {\n          node {\n            name\n            id\n            role\n            updatedAt\n          }\n        }\n      }\n    }`);
  const data = await response.json();
  const themes = data?.data?.themes?.edges?.map(edge => ({
    name: edge.node.name,
    id: edge.node.id,
    role: edge.node.role,
    updated_at: edge.node.updatedAt,
    status: edge.node.role === "main" ? "active" : "inactive"
  })) || [];
  // Default to main theme
  const mainTheme = themes.find(t => t.role === "main") || themes[0] || null;

  // Get saved themeId for this shop
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const { session } = await shopify.authenticate.admin(request);
  const shop = session.shop;
  let record = await prisma.themeSettings.findFirst({ where: { shop } });
  const savedThemeId = record?.themeId || "";
  return json({ themes, mainTheme, savedThemeId });
};


export const action = async ({ request }) => {
  const shopify = (await import("../shopify.server")).default;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const { session } = await shopify.authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const themeId = form.get("themeId") || "";
  // Find existing record by shop
  const existing = await prisma.themeSettings.findFirst({ where: { shop } });
  if (existing) {
    await prisma.themeSettings.update({
      where: { id: existing.id },
      data: { themeId },
    });
  } else {
    await prisma.themeSettings.create({
      data: { shop, themeId, jsonSchema: "" },
    });
  }
  return null;
};


import React, { useState } from "react";
import { Page, Layout, Card, Button, Link, BlockStack, InlineStack, Text, Box, Select } from "@shopify/polaris";
import { useNavigate, Outlet, useMatches } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";



const Settings = () => {
  const { themes, mainTheme, savedThemeId } = useLoaderData();
  const [selectedThemeId, setSelectedThemeId] = useState(savedThemeId);
  const selectedTheme = themes.find(t => t.id === selectedThemeId) || null;
  const submit = useSubmit();
  const navigate = useNavigate();
  const navigateToSchema = () => {
    navigate(`/app/settings/schema?themeId=${selectedThemeId}`);
  };
  // Format date for display
  const lastSaved = selectedTheme?.updated_at ? new Date(selectedTheme.updated_at).toLocaleDateString() : "-";

  // If a nested route is active (e.g. /app/settings/schema), only render <Outlet />
  const matches = useMatches();
  const isNested = matches[matches.length - 1].id !== "routes/app.settings";
  if (isNested) {
    return <Outlet />;
  }

  // Build options for Select dropdown
  const themeOptions = [
    { label: "Select a theme", value: "" },
    ...themes.map(t => ({ label: t.name + (t.status === "active" ? " (Active)" : ""), value: t.id }))
  ];

  // Auto-save themeId to Prisma when changed
  function handleThemeChange(newThemeId) {
    setSelectedThemeId(newThemeId);
    const form = new FormData();
    form.append("themeId", newThemeId);
    submit(form, { method: "post", action: "/app/settings" });
  }

  return (
    <Page title="Settings">
      <Layout>
        {/* Theme installation section */}
        <Layout.Section>
          <InlineStack alignment="leading" gap="loose">
            <Box minWidth="220px" width="25%">
              <Text variant="headingMd" as="h2">Theme installation</Text>
              <Text color="subdued" as="p">
                Select a theme to install Abra. Changing the theme will require a new installation and setup.
              </Text>
            </Box>
            <Box minWidth="320px" width="60%">
              <Card title="Select theme" sectioned>
                <BlockStack gap="tight">
                  <Select
                    label="Choose a theme"
                    options={themeOptions}
                    value={selectedThemeId}
                    onChange={handleThemeChange}
                  />
                  {selectedTheme && (
                    <Text color="subdued" as="p" variant="bodySm" marginBlockStart="2">Last saved: {lastSaved}</Text>
                  )}
                </BlockStack>
              </Card>
            </Box>
          </InlineStack>
        </Layout.Section>

        {/* Dynamic pricing section */}
        <Layout.Section>
          <InlineStack alignment="leading" gap="loose">
            <Box minWidth="220px" width="25%">
              <Text variant="headingMd" as="h2">Dynamic pricing</Text>
              <Text color="subdued" as="p">
                Dynamic pricing enables your online store to display discounted prices during promotions.
              </Text>
            </Box>
            <Box minWidth="320px" width="60%">
              <Card title="Dynamic pricing schema" sectioned>
                <BlockStack gap="tight">
                  <Text size="small">
                    This set up requires a developer to add pricing elements schema for your theme. View our{' '}
                    <Link url="#" external>Self-help documentation</Link> or contact our team for assistance.
                  </Text>
                  <InlineStack gap="tight">
                    <Button>Contact us</Button>
                    <Button onClick={navigateToSchema}>Edit JSON file</Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Box>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default Settings;



