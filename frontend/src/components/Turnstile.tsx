"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; theme?: "light" | "dark" | "auto"; callback: (token: string) => void; "expired-callback"?: () => void; "error-callback"?: () => void },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => existing.addEventListener("load", () => resolve(), { once: true }));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load the CAPTCHA widget. Check your connection and try again."));
    document.head.appendChild(script);
  });
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

// Renders Cloudflare Turnstile. The site key is public by design (Turnstile's
// security comes from the paired secret key, verified server-side in the
// submit-application Edge Function -- never trust a client-side pass alone).
export default function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const containerId = useId();
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled) return;
        const container = document.getElementById(containerId);
        if (!container || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          theme: "dark",
          callback: onVerify,
          "expired-callback": onExpire,
          "error-callback": onError,
        });
      })
      .catch(() => onError?.());

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, containerId]);

  if (!siteKey) {
    return (
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
        CAPTCHA is not configured for this environment.
      </p>
    );
  }

  return <div id={containerId} />;
}
