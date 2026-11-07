"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { PublicUpiPayment } from "../../../../lib/upiClient";
import styles from "./upiCheckout.module.css";

type Props = {
  payment: PublicUpiPayment;
  title: string;
  description: string;
  reference: string;
  onReferenceChange: (value: string) => void;
  onCheckPayment: () => void;
  checking: boolean;
  error?: string;
  onRetry?: () => void;
  paidMessage: string;
  underpaidMessage: string;
  secondaryAction?: ReactNode;
};

function getAppLinks(paymentLink: string) {
  try {
    const url = new URL(paymentLink);
    const query = url.search;
    return [
      { name: "Google Pay", label: "GPay", href: `tez://upi/pay${query}`, className: styles.gpay },
      { name: "PhonePe", label: "PhonePe", href: `phonepe://pay${query}`, className: styles.phonepe },
      { name: "Paytm", label: "Paytm", href: `paytmmp://pay${query}`, className: styles.paytm },
    ];
  } catch {
    return [];
  }
}

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function UpiCheckout({
  payment,
  title,
  description,
  reference,
  onReferenceChange,
  onCheckPayment,
  checking,
  error,
  onRetry,
  paidMessage,
  underpaidMessage,
  secondaryAction,
}: Props) {
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState<"upi" | "reference" | null>(null);
  const [copyError, setCopyError] = useState("");
  const expiresAt = Date.parse(payment.expiresAt);
  const timeRemaining = Number.isFinite(expiresAt) ? expiresAt - now : 0;
  const appLinks = useMemo(() => getAppLinks(payment.link), [payment.link]);

  useEffect(() => {
    if (payment.status !== "pending") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [payment.status]);

  async function copyValue(kind: "upi" | "reference", value: string) {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => current === kind ? null : current), 1800);
    } catch {
      setCopyError("Clipboard access is unavailable in this browser. You can select and copy the value instead.");
    }
  }

  if (payment.status === "paid") {
    return (
      <section className={styles.checkout} aria-labelledby="upi-checkout-title">
        <div className={`${styles.statusPanel} ${styles.statusPaid}`}>
          <span className={styles.statusIcon}><CheckCircle2 size={26} /></span>
          <div>
            <p className={styles.statusEyebrow}>Payment received</p>
            <h2 id="upi-checkout-title" className={styles.statusTitle}>You&apos;re all set</h2>
            <p className={styles.statusText}>{paidMessage}</p>
          </div>
        </div>
      </section>
    );
  }

  if (payment.status === "expired") {
    return (
      <section className={styles.checkout} aria-labelledby="upi-checkout-title">
        <div className={`${styles.statusPanel} ${styles.statusExpired}`}>
          <span className={styles.statusIcon}><Clock3 size={25} /></span>
          <div className={styles.statusCopy}>
            <p className={styles.statusEyebrow}>Checkout closed</p>
            <h2 id="upi-checkout-title" className={styles.statusTitle}>This payment link has expired</h2>
            <p className={styles.statusText}>No charge was made. Start a fresh payment to get a new secure QR and UPI link.</p>
            {onRetry && (
              <button type="button" className={styles.primaryButton} onClick={onRetry}>
                <RefreshCw size={16} /> Start a new payment
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (payment.status === "underpaid") {
    return (
      <section className={styles.checkout} aria-labelledby="upi-checkout-title">
        <div className={`${styles.statusPanel} ${styles.statusReview}`}>
          <span className={styles.statusIcon}><AlertCircle size={25} /></span>
          <div>
            <p className={styles.statusEyebrow}>Payment needs a review</p>
            <h2 id="upi-checkout-title" className={styles.statusTitle}>We received a different amount</h2>
            <p className={styles.statusText}>{underpaidMessage}</p>
          </div>
        </div>
      </section>
    );
  }

  const isCheckingExpiry = timeRemaining <= 0;

  return (
    <section className={styles.checkout} aria-labelledby="upi-checkout-title">
      <div className={styles.checkoutHeader}>
        <div className={styles.headerCopy}>
          <span className={styles.kicker}><LockKeyhole size={13} /> Secure UPI checkout</span>
          <h2 id="upi-checkout-title" className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>
        <div className={styles.amountBlock}>
          <span className={styles.amountLabel}>Amount due</span>
          <strong className={styles.amount}>₹{Number(payment.payAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          <span className={styles.amountNote}>INR · one-time payment</span>
        </div>
      </div>

      <div className={styles.checkoutBody}>
        <div className={styles.qrColumn}>
          <div className={styles.qrStage}>
            {payment.qr ? (
              <div className={styles.qrCode} dangerouslySetInnerHTML={{ __html: payment.qr }} />
            ) : (
              <div className={styles.qrPlaceholder} role="status">Preparing your QR…</div>
            )}
            <span className={styles.qrCorner} aria-hidden="true" />
          </div>
          <div className={styles.qrCaption}>
            <Smartphone size={15} />
            <span>Scan with any UPI app</span>
          </div>
          <span className={styles.desktopHint}>Use a second device to scan this code</span>
        </div>

        <div className={styles.paymentDetails}>
          <div className={styles.payeeRow}>
            <div className={styles.payeeMark}>H</div>
            <div className={styles.payeeCopy}>
              <span className={styles.detailLabel}>Paying</span>
              <strong>{payment.payeeName}</strong>
            </div>
            <ShieldCheck className={styles.verifiedIcon} size={19} aria-label="Secure payment" />
          </div>

          <div className={styles.upiIdRow}>
            <div>
              <span className={styles.detailLabel}>UPI ID</span>
              <strong className={styles.upiId}>{payment.upiId}</strong>
            </div>
            <button type="button" className={styles.copyButton} onClick={() => void copyValue("upi", payment.upiId)} aria-label="Copy UPI ID">
              {copied === "upi" ? <Check size={16} /> : <Copy size={15} />}
              <span>{copied === "upi" ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div className={styles.mobilePay}>
            <span className={styles.detailLabel}>Pay directly in your app</span>
            {appLinks.length > 0 ? (
              <div className={styles.appButtons}>
                {appLinks.map((app) => (
                  <a key={app.name} className={`${styles.appButton} ${app.className}`} href={app.href} aria-label={`Pay with ${app.name}`}>
                    <span className={styles.appMark} aria-hidden="true">{app.label === "GPay" ? "G" : app.label.slice(0, 1)}</span>
                    <span>{app.label}</span>
                    <ArrowUpRight size={14} className={styles.appArrow} />
                  </a>
                ))}
              </div>
            ) : (
              <a className={styles.fallbackPay} href={payment.link}>Open in a UPI app <ArrowUpRight size={15} /></a>
            )}
          </div>

          <div className={styles.liveStatus} role="status" aria-live="polite">
            <span className={styles.liveDot} />
            <span>{isCheckingExpiry ? "Checking payment status…" : "Waiting for payment confirmation"}</span>
            <span className={styles.timer}>{isCheckingExpiry ? "SYNC" : formatRemaining(timeRemaining)}</span>
          </div>
          <p className={styles.statusHint}>
            {isCheckingExpiry
              ? "If you’ve already paid, we’re checking for the bank confirmation."
              : "This page updates automatically when your bank confirms the payment."}
          </p>

          <div className={styles.referenceBlock}>
            <label htmlFor="upi-utr" className={styles.referenceLabel}>
              Already paid? Enter the 12-digit UTR from your bank receipt
            </label>
            <div className={styles.referenceRow}>
              <input
                id="upi-utr"
                inputMode="numeric"
                autoComplete="off"
                value={reference}
                onChange={(event) => onReferenceChange(event.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="e.g. 408812345678"
                maxLength={12}
                disabled={checking}
                className={styles.referenceInput}
              />
              <button type="button" className={styles.checkButton} disabled={checking || reference.length !== 12} onClick={onCheckPayment}>
                {checking ? "Checking…" : "Verify UTR"}
              </button>
            </div>
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}
          {copyError && <p className={styles.error} role="alert">{copyError}</p>}
          {copied === "reference" && <span className={styles.srOnly}>Payment reference copied.</span>}
        </div>
      </div>

      <div className={styles.checkoutFooter}>
        <span><ShieldCheck size={15} /> Payment details are encrypted in transit</span>
        <button type="button" className={styles.paymentRefButton} onClick={() => void copyValue("reference", payment.ref)} aria-label="Copy payment reference">
          {copied === "reference" ? <Check size={13} /> : <Copy size={12} />}
          <span>Ref&nbsp; {payment.ref}</span>
        </button>
      </div>
      {secondaryAction && <div className={styles.secondaryAction}>{secondaryAction}</div>}
    </section>
  );
}
