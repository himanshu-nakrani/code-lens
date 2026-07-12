import { describe, expect, it } from "vitest";
import { isThemeId, THEME_BOOT_SCRIPT, THEME_STORAGE_KEY } from "./theme";

describe("theme helpers", () => {
  it("accepts dark and light only", () => {
    expect(isThemeId("dark")).toBe(true);
    expect(isThemeId("light")).toBe(true);
    expect(isThemeId("system")).toBe(false);
    expect(isThemeId("")).toBe(false);
  });

  it("boot script references storage key", () => {
    expect(THEME_BOOT_SCRIPT).toContain(THEME_STORAGE_KEY);
    expect(THEME_BOOT_SCRIPT).toContain("data-theme");
    expect(THEME_BOOT_SCRIPT).toContain("prefers-color-scheme");
  });
});
