import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  Fingerprint,
  GitCompareArrows,
  Info,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  PlusSquare,
  Settings,
  ShieldCheck,
  Sun,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import { useAppStore } from "../store";
import type { Workspace } from "../types";
import { DURATIONS, Tip, easing } from "./common";

export const navItems: Array<{
  id: Workspace;
  label: string;
  icon: typeof Search;
  shortcut?: string;
}> = [
  { id: "inspect", label: "Inspect", icon: Search, shortcut: "⌘1" },
  { id: "create", label: "Create", icon: PlusSquare, shortcut: "⌘6" },
  { id: "verify", label: "Verify", icon: ShieldCheck, shortcut: "⌘2" },
  { id: "security", label: "Security", icon: Fingerprint, shortcut: "⌘3" },
  { id: "compare", label: "Compare", icon: GitCompareArrows, shortcut: "⌘4" },
  { id: "debug", label: "Debug", icon: TerminalSquare, shortcut: "⌘5" },
];

export const workspaceLabels: Record<Workspace, string> = {
  inspect: "Inspect",
  create: "Create",
  verify: "Verify",
  security: "Security",
  compare: "Compare",
  debug: "Debug",
  settings: "Settings",
  about: "About",
};
export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, workspace, setWorkspace } =
    useAppStore();
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        width: sidebarCollapsed ? 56 : 212,
        duration: DURATIONS.control,
        ease: easing,
      });
      gsap.to(".nav-label, .nav-shortcut, .sidebar-section-label", {
        opacity: sidebarCollapsed ? 0 : 1,
        x: sidebarCollapsed ? -5 : 0,
        duration: DURATIONS.micro,
        ease: easing,
      });
    }, ref);
    return () => ctx.revert();
  }, [sidebarCollapsed]);

  const navButton = ({
    id,
    label,
    icon: Icon,
    shortcut,
  }: (typeof navItems)[number]) => (
    <Tip
      key={id}
      label={
        sidebarCollapsed ? label : `${label}${shortcut ? ` · ${shortcut}` : ""}`
      }
    >
      <button
        className={`nav-item ${workspace === id ? "active" : ""}`}
        aria-current={workspace === id ? "page" : undefined}
        onClick={() => setWorkspace(id)}
      >
        <Icon aria-hidden="true" />
        <span className="nav-label">{label}</span>
        {shortcut && <span className="nav-shortcut">{shortcut}</span>}
      </button>
    </Tip>
  );

  return (
    <aside
      ref={ref}
      className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
    >
      <div className="sidebar-top">
        <button
          className="collapse-button"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          <span className="nav-label">Workspaces</span>
        </button>
        <span className="sidebar-section-label">Workspace</span>
        <nav>{navItems.map(navButton)}</nav>
      </div>
      <nav className="sidebar-bottom">
        {navButton({ id: "settings", label: "Settings", icon: Settings })}
        {navButton({ id: "about", label: "About", icon: Info })}
      </nav>
    </aside>
  );
}



interface PaletteCommand {
  label: string;
  shortcut?: string;
  icon: typeof Search;
  action: () => void;
}

export function CommandPalette({
  open,
  onClose,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setTheme = useAppStore((s) => s.setTheme);
  const clearSensitive = useAppStore((s) => s.clearSensitive);
  const paletteRef = useRef<HTMLDivElement>(null);
  const commands: PaletteCommand[] = [
    ...navItems.map((item) => ({
      label: `Open ${item.label}`,
      shortcut: item.shortcut,
      icon: item.icon,
      action: () => setWorkspace(item.id),
    })),
    {
      label: "Clear sensitive data",
      shortcut: "⌘L",
      icon: Trash2,
      action: () => {
        clearSensitive();
        notify("Sensitive data cleared");
      },
    },
    { label: "Toggle sidebar", icon: Menu, action: toggleSidebar },
    { label: "Use dark theme", icon: Moon, action: () => setTheme("dark") },
    { label: "Use light theme", icon: Sun, action: () => setTheme("light") },
    {
      label: "Open Settings",
      shortcut: "⌘,",
      icon: Settings,
      action: () => setWorkspace("settings"),
    },
  ];
  const visible = commands.filter((command) =>
    command.label
      .toLowerCase()
      .split(" ")
      .every(
        (word) =>
          !query ||
          command.label.toLowerCase().includes(query.toLowerCase()) ||
          word.startsWith(query.toLowerCase()),
      ),
  );
  useLayoutEffect(() => {
    if (!open) return;
    setQuery("");
    const ctx = gsap.context(
      () =>
        gsap.fromTo(
          paletteRef.current,
          { opacity: 0, y: -8, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: DURATIONS.micro,
            ease: easing,
          },
        ),
      paletteRef,
    );
    return () => ctx.revert();
  }, [open]);
  if (!open) return null;
  return (
    <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        ref={paletteRef}
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="palette-search">
          <Search />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="palette-list">
          <span className="eyebrow">Commands</span>
          {visible.map((command) => {
            const Icon = command.icon;
            return (
              <button
                key={command.label}
                onClick={() => {
                  command.action();
                  onClose();
                }}
              >
                <Icon />
                <span>{command.label}</span>
                {command.shortcut && <kbd>{command.shortcut}</kbd>}
              </button>
            );
          })}
          {!visible.length && (
            <div className="palette-empty">No matching commands</div>
          )}
        </div>
      </div>
    </div>
  );
}
