"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";
import { UseThemeToggleLogic } from "@/public/shared/Utils/Theme/ThemeToggleHook";

export const ThemeToggle: React.FC = () => {
  const { isDark, toggle } = UseThemeToggleLogic();

  return (
    <button
      type="button"
      className="p-2 rounded-lg hover:bg-gray-700/50 text-amber-50 border border-white/20 bg-white/5 flex items-center justify-center cursor-pointer interface-btn"
      onClick={toggle}
      aria-pressed={isDark}
    >
      <FontAwesomeIcon icon={isDark ? faMoon : faSun} size="lg" />
    </button>
  );
};

export default ThemeToggle;
