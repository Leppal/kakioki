import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "kakioki-theme";

export const UseThemeToggleLogic = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const initialDark = stored === "dark";
      setIsDark(initialDark);
      if (initialDark) {
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {}
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [isDark]);

  return { isDark, toggle };
};
