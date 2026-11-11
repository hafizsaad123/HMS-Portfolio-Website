"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Copy-to-clipboard for email rows — real functionality with success
 * feedback, never a fake action. Two sizes: "default" (44px circle for
 * the About footer) and "compact" (28px, matching the sidebar's purple
 * outline icon rows like the envelope/pin).
 */
export function CopyEmailButton({
  email,
  size = "default",
}: {
  email: string;
  size?: "default" | "compact";
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        throw new Error("clipboard api unavailable");
      }
      setCopied(true);
    } catch {
      // Fallback for non-secure contexts (http previews) and browsers where
      // the async Clipboard API is blocked: a hidden textarea + execCommand.
      // Still a real copy — never a fake success state.
      try {
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) setCopied(true);
      } catch {
        setCopied(false);
      }
    }
  }

  const compact = size === "compact";

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Email copied to clipboard" : `Copy email address ${email}`}
      className={
        compact
          ? "grid h-7 w-7 shrink-0 place-items-center rounded-full text-brand transition-colors hover:bg-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          : "grid h-11 w-11 shrink-0 place-items-center rounded-full text-brand transition-colors hover:bg-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      }
    >
      {copied ? (
        <Check className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
      ) : (
        <Copy className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
      )}
    </button>
  );
}
