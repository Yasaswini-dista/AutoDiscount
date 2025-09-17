import React, { useState, useEffect } from 'react';
import { json } from "@remix-run/node";
import {
  AppProvider,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Spinner,
  EmptyState,
  Banner,
  Badge,
  Box,
  InlineStack,
  BlockStack
} from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import { useLoaderData, useActionData } from "@remix-run/react";
import { PrismaClient } from "@prisma/client";
import shopify from "../shopify.server";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  const { session } = await shopify.authenticate.admin(request);
  const { shop } = session;
  const accessToken = session?.accessToken;

  // GraphQL query for customer segments
  const SEGMENTS_QUERY = `
    query {
      segments(first: 50) {
        edges {
          node {
            id
            name
            query
            creationDate
            lastEditDate
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
      segments = data.data.segments.edges.map(edge => edge.node);
    }
  } catch (err) {
    error = err.message;
  }

  return json({
    shop,
    accessToken,
    segments,
    error,
  });
};

const CustomerSegments = () => {
  const { shop, accessToken, segments, error } = useLoaderData();
  const [selectedSegments, setSelectedSegments] = useState([]);

  // Handle segment selection for discount creation
  const handleSegmentSelection = (segmentId) => {
    setSelectedSegments(prev => {
      if (prev.includes(segmentId)) {
        return prev.filter(id => id !== segmentId);
      } else {
        return [...prev, segmentId];
      }
    });
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (error) {
    return (
      <Card>
        <Box padding="400">
          <Banner tone="critical">
            <p>Error loading segments: {error}</p>
          </Banner>
        </Box>
      </Card>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <Card>
        <Box padding="400">
          <EmptyState
            heading="No customer segments found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Create customer segments in your Shopify admin to target specific groups for discounts.</p>
          </EmptyState>
        </Box>
      </Card>
    );
  }

  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="200">
          <Text variant="headingLg" as="h2">
            Customer Segments
          </Text>
          <Text variant="bodyMd" tone="subdued">
            Select segments to target for your discount coupon
          </Text>
        </BlockStack>
      </Box>
      <ResourceList
        resourceName={{ singular: 'segment', plural: 'segments' }}
        items={segments}
        renderItem={(segment) => {
          const { id, name, query, creationDate } = segment;
          const isSelected = selectedSegments.includes(id);
          return (
            <ResourceItem
              id={id}
              onClick={() => handleSegmentSelection(id)}
              accessibilityLabel={`Select ${name} segment`}
            >
              <Box padding="200">
                <BlockStack gap="100">
                  <InlineStack gap="200" align="space-between">
                    <Text variant="headingMd" as="h3">
                      {name}
                    </Text>
                    {isSelected && (
                      <Badge tone="success">Selected</Badge>
                    )}
                  </InlineStack>
                  <Text variant="bodyMd" tone="subdued">
                    Query: {query}
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Created: {formatDate(creationDate)}
                  </Text>
                </BlockStack>
              </Box>
            </ResourceItem>
          );
        }}
      />
      {selectedSegments.length > 0 && (
        <Box padding="400" borderBlockStartWidth="025" borderColor="border-subdued">
          <InlineStack gap="200">
            <Text variant="headingMd">Selected Segments:</Text>
            <Text>{selectedSegments.length} segment(s) selected</Text>
          </InlineStack>
        </Box>
      )}
    </Card>
  );
};


// Wrap in Polaris AppProvider for i18n and theming
export default function CustomerSegmentsWithProvider(props) {
  return (
    <AppProvider i18n={enTranslations}>
      <CustomerSegments {...props} />
    </AppProvider>
  );
}
