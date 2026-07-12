export type ThemeId = "dark" | "light";

export const THEME_STORAGE_KEY = "code-lens-theme";

export function isThemeId(v: unknown): v is ThemeId {
  return v === "dark" || v === "light";
}

/** Resolve preferred theme: stored → system → dark. */
export function resolveTheme(): ThemeId {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) return stored;
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch {
    /* ignore */
  }
  return "dark";
}

export function applyTheme(theme: ThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function toggleTheme(current: ThemeId): ThemeId {
  const next: ThemeId = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

/** Inline boot script — set on <html> before paint to avoid flash. */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}var d=document.documentElement;d.setAttribute("data-theme",t);d.classList.toggle("dark",t==="dark");d.classList.toggle("light",t==="light");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;
