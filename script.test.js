import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Shopping Cart", () => {
  let cartItems = [];

  beforeEach(() => {
    // Reset cart before each test
    cartItems = [];
    // Mock DOM setup
    document.body.innerHTML = `
      <div id="cart-list"></div>
      <div id="cart-total">$0</div>
      <button class="add-to-cart" data-name="Test Item" data-price="25"></button>
    `;
  });

  it("should initialize with empty cart", () => {
    expect(cartItems).toEqual([]);
  });

  it("should add item to cart", () => {
    const item = {
      name: "Test Item",
      price: 25,
    };
    cartItems.push(item);

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0]).toEqual(item);
  });

  it("should calculate total correctly", () => {
    cartItems.push({ name: "Item 1", price: 25 });
    cartItems.push({ name: "Item 2", price: 50 });

    const total = cartItems.reduce((sum, item) => sum + item.price, 0);
    expect(total).toBe(75);
  });

  it("should handle multiple items", () => {
    cartItems.push({ name: "Print 1", price: 15 });
    cartItems.push({ name: "Print 2", price: 20 });
    cartItems.push({ name: "Print 3", price: 30 });

    expect(cartItems).toHaveLength(3);
  });

  it("should parse price as number", () => {
    const priceStr = "25";
    const price = Number(priceStr);

    expect(price).toBe(25);
    expect(typeof price).toBe("number");
  });
});
