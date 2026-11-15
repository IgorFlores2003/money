export type ColorMode = "system" | "light" | "dark";
const KEY = "meudimdim-theme";

export function colorMode(): ColorMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* sem armazenamento */
  }
  return "system";
}

export function applyColorMode(mode = colorMode()) {
  const dark =
    mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0e0e10" : "#0f7a4a");
}

export function setColorMode(mode: ColorMode) {
  try {
    if (mode === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
  applyColorMode(mode);
}
