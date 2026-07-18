import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

function getPriceLookup() {
  const rawValue = process.env.STRIPE_PRICE_IDS;

  if (!rawValue) {
    throw new Error(
      "STRIPE_PRICE_IDS is missing. Add it in Netlify Environment Variables or your local .env file.",
    );
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    throw new Error(
      "STRIPE_PRICE_IDS must be a valid JSON object mapping product names to Stripe price IDs.",
    );
  }
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
    const priceLookup = getPriceLookup();

    const line_items = items.map((item) => {
      const priceId = priceLookup[item.name?.trim()];
      if (!priceId) {
        throw new Error(
          `No Stripe price ID configured for "${item.name}". Add it to STRIPE_PRICE_IDS.`,
        );
      }

      return {
        price: priceId,
        quantity: item.quantity || 1,
      };
    });

    const origin = getSiteOrigin(event);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      ...(normalizedEmail ? { customer_email: normalizedEmail } : {}),
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
