import prisma from "../db.server";
import { sendAbandonedCartEmail } from "./email.server";

/**
 * Upsert a cart event from webhook data
 */
export async function upsertCart(shop, cartData) {
  const {
    token,
    customer,
    total_price,
    currency,
    line_items,
    created_at,
    updated_at,
  } = cartData;

  const customerEmail = customer?.email || null;
  const customerId = customer?.id ? String(customer.id) : null;
  const totalPrice = parseFloat(total_price || 0);

  const existing = await prisma.cartEvent.findFirst({
    where: { shop, cartToken: token },
  });

  if (existing) {
    return prisma.cartEvent.update({
      where: { id: existing.id },
      data: {
        customerEmail,
        customerId,
        totalPrice,
        currency: currency || "EUR",
        lineItems: JSON.stringify(line_items || []),
        updatedAt: new Date(updated_at || Date.now()),
        status: existing.status === "converted" ? "converted" : "active",
      },
    });
  }

  return prisma.cartEvent.create({
    data: {
      shop,
      cartToken: token,
      customerEmail,
      customerId,
      totalPrice,
      currency: currency || "EUR",
      lineItems: JSON.stringify(line_items || []),
      status: "active",
      createdAt: new Date(created_at || Date.now()),
    },
  });
}

/**
 * Mark a cart as converted when order is placed
 */
export async function markCartConverted(shop, checkoutToken) {
  return prisma.cartEvent.updateMany({
    where: { shop, cartToken: checkoutToken, status: { not: "converted" } },
    data: { status: "converted" },
  });
}

/**
 * Scan for abandoned carts and trigger emails
 * Called by a cron-like webhook or scheduled function
 */
export async function processAbandonedCarts(shop) {
  const settings = await prisma.appSettings.findUnique({ where: { shop } });
  const thresholdMinutes = settings?.abandonedThresholdMin || 60;
  const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  // Find carts that are still "active" but haven't been updated since cutoff
  const staleCarts = await prisma.cartEvent.findMany({
    where: {
      shop,
      status: "active",
      updatedAt: { lt: cutoff },
      totalPrice: { gt: 0 },
    },
  });

  const results = { abandoned: 0, emailsSent: 0 };

  for (const cart of staleCarts) {
    await prisma.cartEvent.update({
      where: { id: cart.id },
      data: { status: "abandoned", abandonedAt: new Date() },
    });
    results.abandoned++;

    // Send recovery email if enabled and customer has email
    if (settings?.emailEnabled && cart.customerEmail && !cart.emailSentAt) {
      try {
        await sendAbandonedCartEmail(shop, cart, settings);
        await prisma.cartEvent.update({
          where: { id: cart.id },
          data: { emailSentAt: new Date() },
        });
        results.emailsSent++;
      } catch (err) {
        console.error("Email send failed:", err.message);
      }
    }
  }

  return results;
}

/**
 * Get dashboard analytics for a shop
 */
export async function getCartAnalytics(shop, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [total, byStatus, recentCarts, topProducts] = await Promise.all([
    // Total counts & revenue
    prisma.cartEvent.aggregate({
      where: { shop, createdAt: { gte: since } },
      _count: { id: true },
      _sum: { totalPrice: true },
      _avg: { totalPrice: true },
    }),

    // Group by status
    prisma.cartEvent.groupBy({
      by: ["status"],
      where: { shop, createdAt: { gte: since } },
      _count: { id: true },
      _sum: { totalPrice: true },
    }),

    // Recent carts
    prisma.cartEvent.findMany({
      where: { shop, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // No native JSON grouping in SQLite, handled below
    Promise.resolve([]),
  ]);

  // Calculate recovery rate
  const abandonedCount =
    byStatus.find((s) => s.status === "abandoned")?._count?.id || 0;
  const recoveredCount =
    byStatus.find((s) => s.status === "recovered")?._count?.id || 0;
  const convertedCount =
    byStatus.find((s) => s.status === "converted")?._count?.id || 0;
  const recoveryRate =
    abandonedCount > 0
      ? Math.round((recoveredCount / abandonedCount) * 100)
      : 0;

  // Lost revenue (abandoned carts not recovered)
  const abandonedRevenue =
    byStatus.find((s) => s.status === "abandoned")?._sum?.totalPrice || 0;

  // Daily chart data
  const dailyMap = {};
  for (const cart of recentCarts) {
    const day = cart.createdAt.toISOString().split("T")[0];
    if (!dailyMap[day])
      dailyMap[day] = { date: day, carts: 0, abandoned: 0, revenue: 0 };
    dailyMap[day].carts++;
    if (cart.status === "abandoned") dailyMap[day].abandoned++;
    dailyMap[day].revenue += cart.totalPrice;
  }
  const dailyData = Object.values(dailyMap).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    summary: {
      totalCarts: total._count.id || 0,
      totalRevenue: Math.round((total._sum.totalPrice || 0) * 100) / 100,
      avgCartValue: Math.round((total._avg.totalPrice || 0) * 100) / 100,
      abandonedCount,
      recoveredCount,
      convertedCount,
      recoveryRate,
      abandonedRevenue: Math.round(abandonedRevenue * 100) / 100,
    },
    byStatus,
    recentCarts: recentCarts.map((c) => ({
      ...c,
      lineItems: JSON.parse(c.lineItems || "[]"),
    })),
    dailyData,
  };
}

/**
 * Get live/active carts right now
 */
export async function getActiveCarts(shop) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return prisma.cartEvent.findMany({
    where: {
      shop,
      status: "active",
      updatedAt: { gte: fiveMinutesAgo },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}
