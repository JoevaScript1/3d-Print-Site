export function getCheckoutEndpoint(origin = typeof window !== "undefined" ? window.location.origin : "") {
  if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return "http://localhost:4242/create-checkout-session";
  }

  return "/.netlify/functions/create-checkout-session";
}

export function getCheckoutSessionEndpoint(sessionId, origin = typeof window !== "undefined" ? window.location.origin : "") {
  if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return `http://localhost:4242/checkout-session?session_id=${encodeURIComponent(sessionId)}`;
  }

  return `/.netlify/functions/checkout-session?session_id=${encodeURIComponent(sessionId)}`;
}
