import express from "express";
import Stripe from "stripe";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 4242;
const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.error("Missing STRIPE_SECRET_KEY in environment. See .env.example");
}

const stripe = new Stripe(stripeSecret, { apiVersion: "2022-11-15" });

const productPriceCache = new Map();

async function getPriceId(item) {
  const key = `${item.name}::${item.price}`;
  if (productPriceCache.has(key)) {
    return productPriceCache.get(key);
  }

  const product = await stripe.products.create({
    name: item.name,
    metadata: {
      demo_mode: "true",
      item_name: item.name,
    },
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: Math.round((item.price || 0) * 100),
  });

  productPriceCache.set(key, price.id);
  return price.id;
}

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Stripe demo server running");
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { items, email } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email is required" });
    }

    const priceIds = await Promise.all(items.map((item) => getPriceId(item)));
    const line_items = items.map((item, index) => ({
      price: priceIds[index],
      quantity: item.quantity || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      customer_email: email,
      success_url:
        "http://localhost:5173/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:5173/canceled.html",
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

app.get("/checkout-session", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: "Missing session_id" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer"],
    });

    return res.json({ session });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Unable to retrieve session" });
  }
});

// Webhook endpoint (optional). Use raw body for signature verification.
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn(
        "No STRIPE_WEBHOOK_SECRET configured; webhook signature will not be verified.",
      );
      // If no secret, just parse the body and acknowledge for local testing
      const event = JSON.parse(req.body.toString());
      console.log("Received webhook event (no verification):", event.type);
      return res.json({ received: true });
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret,
      );
      console.log("Verified webhook event:", event.type);
      // Handle specific events (payment_intent.succeeded, charge.refunded, etc.) here
      res.json({ received: true });
    } catch (err) {
      console.error("Webhook signature verification failed.", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  },
);

app.listen(port, () => {
  console.log(`Stripe demo server listening on http://localhost:${port}`);
});
