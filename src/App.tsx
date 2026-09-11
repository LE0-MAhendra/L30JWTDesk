import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { gsap } from "gsap";
import { Check, Search, ShieldCheck, Trash2 } from "lucide-react";
import { InspectionWorkspace } from "./components/InspectionWorkspace";
import {
  CommandPalette,
  Sidebar,
  navItems,
  workspaceLabels,
} from "./components/navigation";
import { DURATIONS, Logo, WindowControls, easing } from "./components/common";
import { AboutWorkspace } from "./components/workspaces/AboutWorkspace";
import { CompareWorkspace } from "./components/workspaces/CompareWorkspace";
import { DebugWorkspace } from "./components/workspaces/DebugWorkspace";
import { SecurityWorkspace } from "./components/workspaces/SecurityWorkspace";
import { SettingsWorkspace } from "./components/workspaces/SettingsWorkspace";
import { VerifyWorkspace } from "./components/workspaces/VerifyWorkspace";
import { useAppStore } from "./store";
import { mockInspection } from "./services";

function App() {
  const {
    workspace,
    theme,
    sidebarCollapsed,
    inspection,
    setWorkspace,
    clearSensitive,
  } = useAppStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  useEffect(() => {
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : theme;
    document.documentElement.dataset.theme = resolved;
  }, [theme]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") setPaletteOpen(false);
      if (mod && event.key === ",") {
        event.preventDefault();
        setWorkspace("settings");
      }
      if (mod && /^[1-5]$/.test(event.key)) {
        event.preventDefault();
        setWorkspace(navItems[Number(event.key) - 1].id);
      }
      if (mod && event.key.toLowerCase() === "l") {
        event.preventDefault();
        clearSensitive();
        notify("Sensitive data cleared");
      }
      if (mod && event.key === "Enter") {
        const state = useAppStore.getState();
        if (state.token.trim()) state.setInspection(mockInspection());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearSensitive, setWorkspace]);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(
        () =>
          gsap.fromTo(
            mainRef.current,
            { opacity: 0, x: 6 },
            { opacity: 1, x: 0, duration: DURATIONS.panel, ease: easing },
          ),
        mainRef,
      );
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, [workspace]);

  const workspaceContent = useMemo(() => {
    if (workspace === "inspect") return <InspectionWorkspace notify={notify} />;
    if (workspace === "verify") return <VerifyWorkspace notify={notify} />;
    if (workspace === "security") return <SecurityWorkspace />;
    if (workspace === "compare") return <CompareWorkspace notify={notify} />;
    if (workspace === "debug") return <DebugWorkspace notify={notify} />;
    if (workspace === "settings") return <SettingsWorkspace />;
    return <AboutWorkspace />;
  }, [workspace]);

  return (
    <Tooltip.Provider>
      <div
        className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}
      >
        <header className="titlebar" data-tauri-drag-region>
          <div className="brand" data-tauri-drag-region>
            <Logo />
            <strong>L30JWTDesk</strong>
          </div>
          <div className="window-context" data-tauri-drag-region>
            <span>{workspaceLabels[workspace]}</span>
            <i /> <span>{inspection ? "Token active" : "No token loaded"}</span>
          </div>
          <WindowControls />
        </header>
        <Sidebar />
        <section className="workbench">
          <div className="command-strip">
            <div>
              <h1>{workspaceLabels[workspace]}</h1>
              {workspace !== "about" && (
                <span className="local-indicator">
                  <span />
                  Local
                </span>
              )}
            </div>
            <button
              className="palette-trigger"
              onClick={() => setPaletteOpen(true)}
            >
              <Search />
              Quick command<kbd>⌘ K</kbd>
            </button>
          </div>
          <main ref={mainRef}>{workspaceContent}</main>
        </section>
        <footer className="statusbar">
          <span>
            <ShieldCheck />
            Local
          </span>
          <i />
          {inspection ? (
            <>
              <span>{inspection.algorithm}</span>
              <i />
              <span>{(inspection.bytes / 1000).toFixed(2)} KB</span>
              <i />
              <span>Unverified</span>
            </>
          ) : (
            <span>No sensitive data persisted</span>
          )}
          <span className="status-spacer" />
          <button
            onClick={() => {
              clearSensitive();
              notify("Sensitive data cleared");
            }}
          >
            <Trash2 />
            Clear sensitive data
          </button>
        </footer>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          notify={notify}
        />
        {toast && (
          <div className="toast" role="status">
            <Check />
            {toast}
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
}

export default App;
