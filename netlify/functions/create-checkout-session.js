import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

let stripeClient;

function getStripe() {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is missing.");
    }

    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

function getSiteOrigin(event) {
  const configuredOrigin =
    process.env.SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL;

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  const originHeader = event.headers?.origin || event.headers?.referer;
  if (originHeader) {
    const match = originHeader.match(/^https?:\/\/[^/]+/);
    return match ? match[0] : "http://localhost:8888";
  }

  return "http://localhost:8888";
}

export function buildLineItems(items) {
  return items.map((item) => {
    const quantity = Number(item.quantity || 1);
    const price = Number(item.price);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid price for "${item.name || "item"}".`);
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for "${item.name || "item"}".`);
    }

    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name?.trim() || "Custom item",
        },
        unit_amount: Math.round(price * 100),
      },
      quantity,
    };
  });
}

export const handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { items, email } = JSON.parse(event.body || "{}") || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No items provided" }),
      };
    }

    const normalizedEmail =
      typeof email === "string" && email.includes("@") ? email : "";
    const line_items = buildLineItems(items);

    // Add shipping cost as a line item
    line_items.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Shipping & Handling",
        },
        unit_amount: 199, // $1.99
      },
      quantity: 1,
    });

    const origin = getSiteOrigin(event);
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      ...(normalizedEmail ? { customer_email: normalizedEmail } : {}),
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/canceled.html`,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal error" }),
    };
  }
};
