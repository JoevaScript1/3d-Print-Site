const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { items, email } = JSON.parse(event.body || "{}") || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No items provided" }) };
    }

    const normalizedEmail = typeof email === "string" && email.includes("@") ? email : "";
    const productPriceCache = new Map();

    async function getPriceId(item) {
      const key = `${item.name}::${item.price}`;
      if (productPriceCache.has(key)) {
        return productPriceCache.get(key);
      }

      const product = await stripe.products.create({
        name: item.name,
        metadata: { demo_mode: "true", item_name: item.name },
      });

      const price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: Math.round((item.price || 0) * 100),
      });

      productPriceCache.set(key, price.id);
      return price.id;
    }

    const priceIds = await Promise.all(items.map((item) => getPriceId(item)));
    const line_items = items.map((item, index) => ({
      price: priceIds[index],
      quantity: item.quantity || 1,
    }));

    const origin = event.headers.origin || "https://your-site.netlify.app";
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
