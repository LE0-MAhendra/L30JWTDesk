import { useEffect, useState } from "react";
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
  X,
} from "lucide-react";
import { useAppStore } from "../store";
import type { Workspace } from "../types";

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
  const navButton = ({
    id,
    label,
    icon: Icon,
    shortcut,
  }: (typeof navItems)[number]) => (
    <button
      key={id}
      className={`nav-item ${workspace === id ? "active" : ""}`}
      aria-current={workspace === id ? "page" : undefined}
      aria-label={sidebarCollapsed ? label : undefined}
      title={`${label}${shortcut ? ` · ${shortcut}` : ""}`}
      onClick={() => setWorkspace(id)}
    >
      <Icon aria-hidden="true" />
      <span className="nav-label">{label}</span>
      {shortcut && <span className="nav-shortcut">{shortcut}</span>}
    </button>
  );

  return (
    <aside
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

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const { workspace, setWorkspace } = useAppStore();
  const primaryItems = navItems.slice(0, 4);
  const moreItems = [
    ...navItems.slice(4),
    { id: "settings" as Workspace, label: "Settings", icon: Settings },
    { id: "about" as Workspace, label: "About", icon: Info },
  ];
  const select = (id: Workspace) => {
    setWorkspace(id);
    setOpen(false);
  };
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <>
      <nav className="mobile-navigation" aria-label="Primary navigation">
        {primaryItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={workspace === id ? "active" : ""}
            aria-current={workspace === id ? "page" : undefined}
            onClick={() => select(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
        <button
          className={moreItems.some((item) => item.id === workspace) ? "active" : ""}
          aria-expanded={open}
          aria-controls="mobile-more-navigation"
          onClick={() => setOpen(true)}
        >
          <Menu aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
      {open && (
        <div className="mobile-menu-backdrop" onMouseDown={() => setOpen(false)}>
          <section
            id="mobile-more-navigation"
            className="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="More workspaces"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mobile-menu-heading">
              <span>More workspaces</span>
              <button aria-label="Close menu" onClick={() => setOpen(false)}>
                <X aria-hidden="true" />
              </button>
            </div>
            {moreItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={workspace === id ? "active" : ""}
                aria-current={workspace === id ? "page" : undefined}
                onClick={() => select(id)}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </section>
        </div>
      )}
    </>
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
        notify("Sensitive data and saved tokens cleared");
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
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);
  if (!open) return null;
  return (
    <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
      <div
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
