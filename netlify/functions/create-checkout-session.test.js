import { describe, expect, it } from "vitest";
import { buildLineItems } from "./create-checkout-session.js";

describe("buildLineItems", () => {
  it("creates Stripe price_data line items from cart prices", () => {
    const items = [
      { name: "Raccoon Set", price: 25, quantity: 2 },
      { name: "Penjamin Earrings", price: 12.5 },
    ];

    expect(buildLineItems(items)).toEqual([
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Raccoon Set",
          },
          unit_amount: 2500,
        },
        quantity: 2,
      },
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Penjamin Earrings",
          },
          unit_amount: 1250,
        },
        quantity: 1,
      },
    ]);
  });

  it("throws for invalid prices", () => {
    expect(() => buildLineItems([{ name: "Bad item", price: "free" }])).toThrow(
      /Invalid price/i,
    );
  });
});
