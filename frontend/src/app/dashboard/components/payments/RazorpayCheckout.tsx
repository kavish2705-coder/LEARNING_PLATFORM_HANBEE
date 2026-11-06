"use client";

import { useEffect, useRef, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import {
  createRazorpayOrder,
  getRazorpayQuote,
  getRazorpayOrderStatus,
  verifyRazorpayPayment,
  type RazorpayPaymentResult,
  type RazorpayPurpose,
  type RazorpayQuote,
} from "../../../../lib/razorpayClient";
import styles from "./RazorpayCheckout.module.css";

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  theme: { color: string };
  handler: (result: RazorpayPaymentResult) => void | Promise<void>;
  modal: { ondismiss: () => void };
}

interface RazorpayFailure {
  error?: { description?: string };
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", callback: (response: RazorpayFailure) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let razorpayScript: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScript) return razorpayScript;

  razorpayScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => window.Razorpay ? resolve() : reject(new Error("Razorpay Checkout did not load."));
    script.onerror = () => reject(new Error("Razorpay Checkout could not load. Check your connection and try again."));
    document.body.appendChild(script);
  }).catch((error: unknown) => {
    razorpayScript = null;
    throw error;
  });
  return razorpayScript;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function RazorpayCheckout({
  purpose,
  referenceId,
  label = "Pay securely with Razorpay",
  description,
  onPaymentComplete,
}: {
  purpose: RazorpayPurpose;
  referenceId?: string;
  label?: string;
  description: string;
  onPaymentComplete: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<RazorpayQuote | null>(null);
  const verifyingPayment = useRef(false);

  useEffect(() => {
    let active = true;
    setQuote(null);
    setError("");
    getRazorpayQuote(purpose, referenceId)
      .then((paymentQuote) => { if (active) setQuote(paymentQuote); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the payment amount.");
      });
    return () => { active = false; };
  }, [purpose, referenceId]);

  async function handlePaymentSuccess(payment: RazorpayPaymentResult) {
    verifyingPayment.current = true;
    try {
      const verified = await verifyRazorpayPayment(payment);
      if (verified.status === "captured") {
        await onPaymentComplete();
        return;
      }

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await wait(2000);
        const order = await getRazorpayOrderStatus(payment.razorpay_order_id);
        if (order.status === "captured") {
          await onPaymentComplete();
          return;
        }
      }
      setError(`Your payment is processing. Do not pay again. If access does not update, contact support with payment ID ${payment.razorpay_payment_id}.`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "We couldn't confirm the payment.";
      setError(`${message} If Razorpay shows the payment as successful, do not pay again; contact support with payment ID ${payment.razorpay_payment_id}.`);
    } finally {
      verifyingPayment.current = false;
      setBusy(false);
    }
  }

  async function startCheckout() {
    if (!quote) return;
    setBusy(true);
    setError("");
    try {
      await loadRazorpayScript();
      const order = await createRazorpayOrder(purpose, referenceId);
      if (!window.Razorpay) throw new Error("Razorpay Checkout is unavailable. Please try again.");
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Hanbee Technologies Private Limited",
        description,
        order_id: order.orderId,
        theme: { color: "#0f766e" },
        handler: handlePaymentSuccess,
        modal: { ondismiss: () => { if (!verifyingPayment.current) setBusy(false); } },
      });
      checkout.on("payment.failed", (response) => {
        setError(
          response.error?.description ||
          "Payment did not complete. Entry or access is activated only after Razorpay confirms payment. Contact support if your bank shows a debit.",
        );
        setBusy(false);
      });
      checkout.open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't start secure checkout.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {quote && (
        <p className={styles.amount}>
          Amount due: <strong>{quote.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</strong>
          <span> · one-time payment</span>
        </p>
      )}
      <button type="button" className={styles.button} onClick={() => void startCheckout()} disabled={busy || !quote}>
        {busy ? <span className={styles.spinner} aria-hidden="true" /> : <LockKeyhole size={16} aria-hidden="true" />}
        {busy ? "Opening secure checkout…" : quote ? label : "Loading payment amount…"}
      </button>
      <p className={styles.assurance}><ShieldCheck size={14} aria-hidden="true" /> Payment is confirmed securely by Razorpay.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
