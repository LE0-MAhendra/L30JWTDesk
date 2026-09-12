import { useState } from "react";
import { LayoutPanelLeft, Moon, Sun } from "lucide-react";
import { useAppStore } from "../../store";
import type { Theme } from "../../types";

export function SettingsWorkspace() {
  const { theme, setTheme } = useAppStore();
  const [density, setDensity] = useState(
    localStorage.getItem("l30-density") ?? "Compact",
  );
  const [reduced, setReduced] = useState(
    localStorage.getItem("l30-reduced") === "true",
  );
  return (
    <div className="workspace-scroll settings-page">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Preferences</span>
          <h2>Settings</h2>
          <p>
            Control appearance, privacy, network visibility, and keyboard
            behavior.
          </p>
        </div>
      </div>
      <section className="settings-section">
        <h3>Appearance</h3>
        <div className="settings-row">
          <div>
            <strong>Theme</strong>
            <span>Use a dark, light, or system-matched interface.</span>
          </div>
          <div className="segmented-control compact">
            {(["dark", "light", "system"] as Theme[]).map((item) => (
              <button
                className={theme === item ? "active" : ""}
                key={item}
                onClick={() => setTheme(item)}
              >
                {item === "dark" ? (
                  <Moon />
                ) : item === "light" ? (
                  <Sun />
                ) : (
                  <LayoutPanelLeft />
                )}
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>UI density</strong>
            <span>Adjust workspace spacing without reducing information.</span>
          </div>
          <select
            aria-label="UI density"
            value={density}
            onChange={(e) => {
              setDensity(e.target.value);
              localStorage.setItem("l30-density", e.target.value);
              document.documentElement.dataset.density =
                e.target.value.toLowerCase();
            }}
          >
            <option>Compact</option>
            <option>Comfortable</option>
          </select>
        </div>
        <div className="settings-row">
          <div>
            <strong>Reduce motion</strong>
            <span>
              Replace coordinated transitions with immediate state changes.
            </span>
          </div>
          <Toggle
            checked={reduced}
            onChange={(checked) => {
              setReduced(checked);
              localStorage.setItem("l30-reduced", String(checked));
              document.documentElement.classList.toggle(
                "reduce-motion",
                checked,
              );
            }}
          />
        </div>
      </section>
      <section className="settings-section shortcut-section">
        <h3>Keyboard</h3>
        {[
          ["Command palette", "⌘ K"],
          ["Inspect token", "⌘ ↵"],
          ["Clear current token", "⌘ L"],
          ["Copy diagnostic report", "⌘ ⇧ C"],
          ["Settings", "⌘ ,"],
        ].map(([label, keys]) => (
          <div className="shortcut-row" key={label}>
            <span>{label}</span>
            <kbd>{keys}</kbd>
          </div>
        ))}
      </section>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      className={`toggle ${checked ? "on" : ""}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

