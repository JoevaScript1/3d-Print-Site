import { getCheckoutEndpoint } from "./checkout-config.js";

const cartList = document.getElementById("cart-list");
const cartTotal = document.getElementById("cart-total");
const addToCartButtons = document.querySelectorAll(".add-to-cart");

let cartItems = [];

function renderCart() {
  if (!cartList) return;

  if (cartItems.length === 0) {
    cartList.innerHTML = "<li>Your cart is empty.</li>";
    cartTotal.textContent = "$0";
    return;
  }

  cartList.innerHTML = "";
  let total = 0;

  cartItems.forEach((item, index) => {
    total += item.price;
    const li = document.createElement("li");
    li.className = "cart-item";

    const itemInfo = document.createElement("span");
    itemInfo.className = "cart-item__info";
    itemInfo.textContent = `${item.name} — $${item.price}`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "cart-item__remove";
    removeBtn.textContent = "✕";
    removeBtn.title = "Remove item";
    removeBtn.onclick = () => removeFromCart(index);

    li.appendChild(itemInfo);
    li.appendChild(removeBtn);
    cartList.appendChild(li);
  });

  cartTotal.textContent = `$${total}`;
}

function removeFromCart(index) {
  cartItems.splice(index, 1);
  renderCart();
}

addToCartButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const item = {
      name: button.dataset.name,
      price: Number(button.dataset.price),
    };

    cartItems.push(item);
    renderCart();

    button.textContent = "Added";
    button.disabled = true;
    setTimeout(() => {
      button.textContent = "Add to Cart";
      button.disabled = false;
    }, 900);
  });
});

renderCart();

// Checkout flow — POST cart to the demo server
const checkoutButton = document.getElementById("checkout-button");
if (checkoutButton) {
  checkoutButton.addEventListener("click", async () => {
    if (!cartItems || cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    checkoutButton.disabled = true;
    checkoutButton.textContent = "Redirecting...";

    try {
      const endpoint = getCheckoutEndpoint();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Network response was not ok");
      }

      const data = await res.json();
      if (data.url) {
        window.location = data.url;
      } else {
        throw new Error("No redirect URL returned");
      }
    } catch (err) {
      console.error(err);
      alert(
        err.message || "Unable to start checkout. See console for details.",
      );
      checkoutButton.disabled = false;
      checkoutButton.textContent = "Checkout";
    }
  });
}
