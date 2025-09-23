import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Card, Button, TextField, Box, Page, Layout, Modal, Checkbox, Spinner } from "@shopify/polaris";
import { Outlet, useMatches } from "@remix-run/react";

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
    // TODO: Fetch promotions from DB or metafield. For now, mock list
    const [promotions] = useState([
      // Example: { id: 'uuid-1', title: 'Black Friday', discountId: 'gid://shopify/DiscountCodeApp/123' }
    ]);
    const navigate = useNavigate();
    const navigateToNew = () => {
      navigate("/app/promotions/new");
    };

    // If a nested route is active (e.g. /app/promotions/new), only render <Outlet />
    const matches = useMatches();
    const isNested = matches[matches.length - 1].id !== "routes/app.promotions";
    if (isNested) {
      return <Outlet />;
    }

    // Otherwise, render the promotions list page
    return (
      <Page title="Promotions">
        <Layout>
          <Layout.Section>
            <Box padding="8" display="flex" flexDirection="column" alignItems="center">
              <img
                src="https://cdn.shopify.com/shopifycloud/web/assets/v1/hand-phone.svg"
                alt="Create promotion"
                style={{ width: 120, marginBottom: 24 }}
              />
              <h2 style={{ fontWeight: 600, fontSize: 22, marginBottom: 8 }}>
                Promotions
              </h2>
              <p style={{ marginBottom: 24 }}>
                Launch promotions that your customers see and understand.
              </p>
              <Button primary onClick={navigateToNew}>
                Create promotion
              </Button>
            </Box>
            <Box padding="8" display="flex" flexDirection="column" alignItems="center">
              {promotions.length === 0 ? (
                <div style={{ color: '#999', marginTop: 24 }}>No promotions found</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, marginTop: 24, width: '100%', maxWidth: 500 }}>
                  {promotions.map((promo) => (
                    <li key={promo.id} style={{ marginBottom: 16 }}>
                      <a href={`/app/promotions/${promo.id}`} style={{ fontWeight: 600, fontSize: 16, textDecoration: 'none', color: '#005fa3' }}>
                        {promo.title}
                      </a>
                      <span style={{ color: '#6d7175', fontSize: 13, marginLeft: 8 }}>({promo.discountId})</span>
                    </li>
                  ))}
                </ul>
              )}
            </Box>
          </Layout.Section>
        </Layout>
      </Page>
    );
}