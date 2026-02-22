import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useRevalidator } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineGrid,
  DataTable,
  Badge,
  Button,
  Tabs,
  Box,
  InlineStack,
  Divider,
  EmptyState,
  Spinner,
  Banner,
  Tooltip,
} from "@shopify/polaris";
import { useState, useEffect, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { getCartAnalytics, getActiveCarts, processAbandonedCarts } from "../lib/cart.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30");

  const [analytics, activeCarts] = await Promise.all([
    getCartAnalytics(shop, days),
    getActiveCarts(shop),
  ]);

  return json({ analytics, activeCarts, shop, days });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const results = await processAbandonedCarts(session.shop);
  return json({ success: true, ...results });
};

function StatCard({ title, value, subtitle, color = "#1a1a2e" }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="bodySm" color="subdued">{title}</Text>
        <Text variant="heading2xl" fontWeight="bold" style={{ color }}>
          {value}
        </Text>
        {subtitle && <Text variant="bodySm" color="subdued">{subtitle}</Text>}
      </BlockStack>
    </Card>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: { tone: "success", label: "🟢 Ενεργό" },
    abandoned: { tone: "critical", label: "🔴 Εγκαταλελ." },
    recovered: { tone: "attention", label: "🟡 Ανακτήθηκε" },
    converted: { tone: "info", label: "🔵 Αγοράστηκε" },
  };
  const { tone, label } = map[status] || { tone: "new", label: status };
  return <Badge tone={tone}>{label}</Badge>;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("el-GR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function Dashboard() {
  const { analytics, activeCarts, shop, days } = useLoaderData();
  const { summary, recentCarts, dailyData } = analytics;
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedDays, setSelectedDays] = useState(days);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      revalidator.revalidate();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleProcessAbandoned = useCallback(() => {
    fetcher.submit({}, { method: "post" });
  }, [fetcher]);

  const isProcessing = fetcher.state === "submitting";
  const processResult = fetcher.data;

  const tabs = [
    { id: "overview", content: "📊 Επισκόπηση" },
    { id: "live", content: `🔴 Live (${activeCarts.length})` },
    { id: "abandoned", content: `⚠️ Εγκαταλελ. (${summary.abandonedCount})` },
    { id: "all", content: "📋 Όλα τα Καλάθια" },
  ];

  // Abandoned carts
  const abandonedCarts = recentCarts.filter((c) => c.status === "abandoned");

  // Table rows helpers
  const cartToRow = (cart) => [
    cart.cartToken.slice(0, 12) + "…",
    cart.customerEmail || <Text color="subdued">Ανώνυμος</Text>,
    <StatusBadge key={cart.id} status={cart.status} />,
    `${cart.totalPrice.toFixed(2)} ${cart.currency}`,
    cart.lineItems.length + " προϊόντα",
    formatDate(cart.createdAt),
  ];

  return (
    <Page
      title="🛒 Cart Tracker Dashboard"
      subtitle={`${shop} • Τελευταία ενημέρωση: ${new Date().toLocaleTimeString("el-GR")}`}
      secondaryActions={[
        {
          content: "⚙️ Ρυθμίσεις",
          url: "/app/settings",
        },
        {
          content: isProcessing ? "Επεξεργασία..." : "🔄 Επεξεργασία Εγκαταλ.",
          onAction: handleProcessAbandoned,
          loading: isProcessing,
        },
      ]}
    >
      <BlockStack gap="500">
        {processResult?.success && (
          <Banner tone="success" onDismiss={() => {}}>
            ✅ Εντοπίστηκαν {processResult.abandoned} εγκαταλελειμμένα καλάθια.
            Εστάλησαν {processResult.emailsSent} emails ανάκτησης.
          </Banner>
        )}

        {/* KPI Summary Cards */}
        <InlineGrid columns={4} gap="400">
          <StatCard
            title="Σύνολο Καλαθιών"
            value={summary.totalCarts}
            subtitle={`Τελευταίες ${selectedDays} μέρες`}
          />
          <StatCard
            title="Εγκαταλελειμμένα"
            value={summary.abandonedCount}
            subtitle={`${summary.abandonedRevenue.toFixed(2)}€ χαμένα`}
            color="#c0392b"
          />
          <StatCard
            title="Ποσοστό Ανάκτησης"
            value={`${summary.recoveryRate}%`}
            subtitle={`${summary.recoveredCount} ανακτήθηκαν`}
            color="#27ae60"
          />
          <StatCard
            title="Μέση Αξία Καλαθιού"
            value={`${summary.avgCartValue.toFixed(2)}€`}
            subtitle={`Σύνολο: ${summary.totalRevenue.toFixed(2)}€`}
          />
        </InlineGrid>

        {/* Tabs */}
        <Card>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            <Box padding="400">
              {/* OVERVIEW TAB */}
              {selectedTab === 0 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">Ημερήσια Δραστηριότητα</Text>
                  {dailyData.length === 0 ? (
                    <EmptyState
                      heading="Δεν υπάρχουν δεδομένα ακόμα"
                      image=""
                    >
                      <p>Περιμένετε webhooks από το Shopify για να αρχίσουν να εμφανίζονται δεδομένα.</p>
                    </EmptyState>
                  ) : (
                    <DataTable
                      columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                      headings={["Ημερομηνία", "Καλάθια", "Εγκαταλ.", "Έσοδα (€)"]}
                      rows={dailyData.slice(-14).map((d) => [
                        d.date,
                        d.carts,
                        d.abandoned,
                        d.revenue.toFixed(2),
                      ])}
                    />
                  )}
                </BlockStack>
              )}

              {/* LIVE TAB */}
              {selectedTab === 1 && (
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd">Live Καλάθια (τελευταία 5 λεπτά)</Text>
                    <Text variant="bodySm" color="subdued">
                      🔄 Αυτόματη ανανέωση κάθε 30δλ
                    </Text>
                  </InlineStack>
                  {activeCarts.length === 0 ? (
                    <EmptyState heading="Δεν υπάρχουν ενεργά καλάθια αυτή τη στιγμή" image="">
                      <p>Τα καλάθια εμφανίζονται εδώ σε πραγματικό χρόνο όταν πελάτες προσθέτουν προϊόντα.</p>
                    </EmptyState>
                  ) : (
                    <DataTable
                      columnContentTypes={["text", "text", "text", "numeric", "text", "text"]}
                      headings={["Token", "Πελάτης", "Κατάσταση", "Αξία", "Προϊόντα", "Τελευταία Ενέργεια"]}
                      rows={activeCarts.map((cart) => [
                        cart.cartToken.slice(0, 10) + "…",
                        cart.customerEmail || "Ανώνυμος",
                        <StatusBadge key={cart.id} status={cart.status} />,
                        `${cart.totalPrice.toFixed(2)}€`,
                        JSON.parse(cart.lineItems || "[]").length + " τεμ.",
                        formatDate(cart.updatedAt),
                      ])}
                    />
                  )}
                </BlockStack>
              )}

              {/* ABANDONED TAB */}
              {selectedTab === 2 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">Εγκαταλελειμμένα Καλάθια</Text>
                  {abandonedCarts.length === 0 ? (
                    <EmptyState heading="Δεν υπάρχουν εγκαταλελειμμένα καλάθια" image="">
                      <p>Πατήστε "Επεξεργασία Εγκαταλ." για να σαρώσετε για εγκαταλελειμμένα καλάθια.</p>
                    </EmptyState>
                  ) : (
                    <DataTable
                      columnContentTypes={["text", "text", "text", "numeric", "text", "text"]}
                      headings={["Token", "Email Πελάτη", "Κατάσταση", "Αξία", "Προϊόντα", "Εγκαταλείφθηκε"]}
                      rows={abandonedCarts.map((cart) => [
                        cart.cartToken.slice(0, 12) + "…",
                        cart.customerEmail || <Text color="subdued">—</Text>,
                        <StatusBadge key={cart.id} status={cart.status} />,
                        `${cart.totalPrice.toFixed(2)}€`,
                        cart.lineItems.length + " τεμ.",
                        formatDate(cart.abandonedAt || cart.updatedAt),
                      ])}
                    />
                  )}
                </BlockStack>
              )}

              {/* ALL CARTS TAB */}
              {selectedTab === 3 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">Όλα τα Καλάθια (τελευταίες {selectedDays} μέρες)</Text>
                  {recentCarts.length === 0 ? (
                    <EmptyState heading="Δεν υπάρχουν δεδομένα" image="">
                      <p>Δεν έχουν ληφθεί webhooks ακόμα.</p>
                    </EmptyState>
                  ) : (
                    <DataTable
                      columnContentTypes={["text", "text", "text", "numeric", "text", "text"]}
                      headings={["Token", "Πελάτης", "Κατάσταση", "Αξία (€)", "Προϊόντα", "Ημ/νία"]}
                      rows={recentCarts.map(cartToRow)}
                    />
                  )}
                </BlockStack>
              )}
            </Box>
          </Tabs>
        </Card>
      </BlockStack>
    </Page>
  );
}
