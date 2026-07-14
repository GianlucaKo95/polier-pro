import { useState, useEffect } from "react";

export function useTheme() {
  const [dark, setDark] = useState(() =>
    localStorage.getItem("polaris-theme") === "dark" ||
    (!localStorage.getItem("polaris-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "";
    localStorage.setItem("polaris-theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}
