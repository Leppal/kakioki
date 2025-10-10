"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type PickerTheme = "light" | "dark";

interface PickerPosition {
  left: number;
  bottom: number;
  ready: boolean;
}

const STORAGE_KEY = "kakioki-theme";

function resolveTheme(): PickerTheme {
  if (typeof document === "undefined") {
    return "light";
  }
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export function UseEmojiPickerLogic(
  isOpen: boolean,
  onClickOutside: () => void
) {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<PickerPosition>({
    left: 0,
    bottom: 0,
    ready: false,
  });
  const [theme, setTheme] = useState<PickerTheme>("light");

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    setPortalElement(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPosition((prev) => ({ ...prev, ready: false }));
    }
  }, [isOpen]);

  const updatePosition = useCallback(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }
    const emojiButton = document.querySelector(".emoji-button");
    if (!emojiButton) {
      setPosition((prev) => ({ ...prev, ready: false }));
      return;
    }
    const rect = (emojiButton as HTMLElement).getBoundingClientRect();
    setPosition({
      left: rect.left,
      bottom: window.innerHeight - rect.top + 20,
      ready: true,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const node = pickerRef.current;
      if (!node) {
        return;
      }
      if (!node.contains(event.target as Node)) {
        onClickOutside();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClickOutside]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    setTheme(resolveTheme());
    const observer =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            setTheme(resolveTheme());
          })
        : null;
    observer?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setTheme(resolveTheme());
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }
    return () => {
      observer?.disconnect();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, []);

  return { pickerRef, portalElement, position, theme } as const;
}
