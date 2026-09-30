import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Search, ShieldCheck, Trash2 } from "lucide-react";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { InspectionWorkspace } from "./components/InspectionWorkspace";
import {
  CommandPalette,
  MobileNavigation,
  Sidebar,
  navItems,
  workspaceLabels,
} from "./components/navigation";
import { Logo, WindowControls } from "./components/common";
import { AboutWorkspace } from "./components/workspaces/AboutWorkspace";
import { CompareWorkspace } from "./components/workspaces/CompareWorkspace";
import { CreateWorkspace } from "./components/workspaces/CreateWorkspace";
import { DebugWorkspace } from "./components/workspaces/DebugWorkspace";
import { SecurityWorkspace } from "./components/workspaces/SecurityWorkspace";
import { SettingsWorkspace } from "./components/workspaces/SettingsWorkspace";
import { VerifyWorkspace } from "./components/workspaces/VerifyWorkspace";
import { useAppStore } from "./store";

const microsoftStoreBuild = import.meta.env.VITE_MICROSOFT_STORE === "true";

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
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "downloading">("idle");
  const [booting, setBooting] = useState(true);
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
    document.documentElement.dataset.density = (
      localStorage.getItem("l30-density") ?? "Compact"
    ).toLowerCase();
    document.documentElement.classList.toggle(
      "reduce-motion",
      localStorage.getItem("l30-reduced") === "true",
    );
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 450);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (microsoftStoreBuild) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (!active) return;
      setUpdateState("checking");
      try {
        const update = await check();
        if (!active || !update) {
          setUpdateState("idle");
          return;
        }
        setUpdateState("downloading");
        await update.downloadAndInstall();
        if (active) await relaunch();
      } catch {
        if (active) setUpdateState("idle");
      }
    }, 4000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);
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
      if (mod && /^[1-6]$/.test(event.key)) {
        event.preventDefault();
        const target = navItems.find((item) => item.shortcut?.endsWith(event.key));
        if (target) setWorkspace(target.id);
      }
      if (mod && event.key.toLowerCase() === "l") {
        event.preventDefault();
        clearSensitive();
        notify("Sensitive data and saved tokens cleared");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearSensitive, setWorkspace]);
  const workspaceContent = useMemo(() => {
    if (workspace === "inspect") return <InspectionWorkspace notify={notify} />;
    if (workspace === "create") return <CreateWorkspace notify={notify} />;
    if (workspace === "verify") return <VerifyWorkspace notify={notify} />;
    if (workspace === "security") return <SecurityWorkspace />;
    if (workspace === "compare") return <CompareWorkspace notify={notify} />;
    if (workspace === "debug") return <DebugWorkspace notify={notify} />;
    if (workspace === "settings") return <SettingsWorkspace />;
    return <AboutWorkspace />;
  }, [workspace]);

  if (booting) {
    return (
      <div className="launch-screen" role="status" aria-live="polite" aria-label="Loading L30JWTDesk">
        <Logo size={64} />
        <strong>L30JWTDesk</strong>
        <span className="launch-loader" />
      </div>
    );
  }

  return (
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
            {updateState !== "idle" && (
              <span className="update-indicator" role="status">
                <LoaderCircle />
                {updateState === "checking" ? "Checking for updates" : "Updating"}
              </span>
            )}
            <button
              className="palette-trigger"
              aria-label="Open command palette"
              onClick={() => setPaletteOpen(true)}
            >
              <Search />
              Quick command<kbd>⌘ K</kbd>
            </button>
          </div>
          <main
            id="main-content"
            key={workspace}
            className="workspace-transition"
          >
            {workspaceContent}
          </main>
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
            <span>No current token in memory</span>
          )}
          <span className="status-spacer" />
          <button
            onClick={() => {
              clearSensitive();
              notify("Sensitive data and saved tokens cleared");
            }}
          >
            <Trash2 />
            Clear sensitive data
          </button>
        </footer>
        <MobileNavigation />
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
  );
}

export default App;
