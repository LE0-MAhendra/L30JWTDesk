import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AppWindow, Minimize2, X } from "lucide-react";

export const DURATIONS = { micro: 0.14, control: 0.2, panel: 0.26 };
export const easing = "power2.out";

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      className="logo"
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-label="L30 logo"
      role="img"
    >
      <path
        d="M14 2.2 24.2 8v12L14 25.8 3.8 20V8L14 2.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8.2 9.4h11.6M8.2 14h7.5M8.2 18.6h11.6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle
        cx="18.8"
        cy="14"
        r="2.2"
        fill="var(--accent)"
        stroke="var(--background)"
      />
    </svg>
  );
}

export function Tip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip.Root delayDuration={450}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" sideOffset={7}>
          {label}
          <Tooltip.Arrow className="tooltip-arrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  pressed?: boolean;
}) {
  return (
    <Tip label={label}>
      <button
        className="icon-button"
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
      >
        {children}
      </button>
    </Tip>
  );
}

export function copyText(text: string, notify: (message: string) => void) {
  void navigator.clipboard
    .writeText(text)
    .then(() => notify("Copied to clipboard"));
}

export function saveText(text: string, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function Countdown({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, expiresAt - Math.floor(Date.now() / 1000)),
  );
  useEffect(() => {
    const id = window.setInterval(
      () =>
        setRemaining(Math.max(0, expiresAt - Math.floor(Date.now() / 1000))),
      1000,
    );
    return () => window.clearInterval(id);
  }, [expiresAt]);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return (
    <span className="countdown">
      {minutes}m {String(seconds).padStart(2, "0")}s
    </span>
  );
}

export function StatusPill({ state, label }: { state: string; label?: string }) {
  return (
    <span className={`status status-${state.toLowerCase().replace(" ", "-")}`}>
      <span className="status-dot" />
      {label ?? state}
    </span>
  );
}

export function WindowControls() {
  const act = async (action: "minimize" | "toggleMaximize" | "close") => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow()[action]();
    } catch {
      /* Browser preview has no native window. */
    }
  };
  return (
    <div className="window-controls">
      <button aria-label="Minimize window" onClick={() => void act("minimize")}>
        <Minimize2 />
      </button>
      <button
        aria-label="Maximize window"
        onClick={() => void act("toggleMaximize")}
      >
        <AppWindow />
      </button>
      <button
        className="window-close"
        aria-label="Close window"
        onClick={() => void act("close")}
      >
        <X />
      </button>
    </div>
  );
}

