import { authenticate } from "../shopify.server";
import {
  upsertCart,
  markCartConverted,
  processAbandonedCarts,
} from "../lib/cart.server";

export const action = async ({ request }) => {
  const { topic, shop, session, payload } = await authenticate.webhook(request);

  console.log(`📦 Webhook received: ${topic} from ${shop}`);

  switch (topic) {
    case "CARTS_CREATE":
    case "CARTS_UPDATE": {
      await upsertCart(shop, payload);
      break;
    }

    case "CHECKOUTS_CREATE":
    case "CHECKOUTS_UPDATE": {
      // Checkouts have more data (email, customer) — upsert using checkout token
      if (payload.token) {
        await upsertCart(shop, {
          ...payload,
          token: payload.token,
        });
      }
      break;
    }

    case "ORDERS_CREATE": {
      // Order placed = cart converted!
      const checkoutToken = payload.checkout_token || payload.cart_token;
      if (checkoutToken) {
        await markCartConverted(shop, checkoutToken);
      }
      break;
    }

    case "APP_UNINSTALLED": {
      // Cleanup would happen here
      console.log(`🚨 App uninstalled from ${shop}`);
      break;
    }

    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }

  return new Response("OK", { status: 200 });
};
