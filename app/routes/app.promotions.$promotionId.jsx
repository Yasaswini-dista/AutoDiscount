import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Card, Page, Layout, TextField, Box, Button } from "@shopify/polaris";

// Loader to fetch promotion details by ID
export const loader = async ({ params }) => {
  const { promotionId } = params;
  // TODO: Fetch promotion from DB or metafield by ID
  // For now, mock data
  return json({
    promotion: {
      id: promotionId,
      title: "Sample Promotion Title",
      discountId: "sample-discount-id",
    },
  });
};

export default function PromotionDetail() {
  const { promotion } = useLoaderData();
  // TODO: Add edit/save logic
  return (
    <Page title={promotion.title}>
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Box paddingBlockEnd="4">
              <TextField label="Promotion title" value={promotion.title} disabled />
            </Box>
            <Box paddingBlockEnd="4">
              <TextField label="Discount ID" value={promotion.discountId} disabled />
            </Box>
            <Button primary disabled>Edit promotion (coming soon)</Button>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
