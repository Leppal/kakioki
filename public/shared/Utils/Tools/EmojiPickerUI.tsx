"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import data from "@emoji-mart/data";
import { Picker } from "emoji-mart";
import { UseEmojiPickerLogic } from "@/public/shared/Tools/EmojiPickerInterface";

interface EmojiPickerProps {
  isOpen: boolean;
  onEmojiSelect: (emoji: { native: string }) => void;
  onClickOutside: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  onEmojiSelect,
  onClickOutside,
}) => {
  const { pickerRef, portalElement, position, theme } = UseEmojiPickerLogic(
    isOpen,
    onClickOutside
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pickerInstanceRef = useRef<
    (HTMLElement & { destroy?: () => void }) | null
  >(null);

  const options = useMemo(
    () => ({
      data,
      onEmojiSelect,
      theme,
      previewPosition: "none",
      skinTonePosition: "none",
      searchPosition: "top",
      set: "native",
      perLine: 8,
      emojiSize: 20,
      maxFrequentRows: 1,
    }),
    [onEmojiSelect, theme]
  );

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    pickerInstanceRef.current?.destroy?.();
    const pickerElement = new Picker(options) as unknown as HTMLElement & {
      destroy?: () => void;
    };
    pickerInstanceRef.current = pickerElement;
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(pickerElement);
    return () => {
      pickerInstanceRef.current?.destroy?.();
      pickerInstanceRef.current = null;
      pickerElement.remove();
    };
  }, [isOpen, options]);

  if (!isOpen || !portalElement) return null;

  const content = (
    <div
      ref={pickerRef}
      className="fixed z-[1000] transform-gpu transition-opacity duration-200 ease-in-out"
      style={{
        bottom: `${position.bottom}px`,
        left: `${position.left}px`,
        opacity: position.ready ? 1 : 0,
        pointerEvents: position.ready ? "auto" : "none",
        animation: position.ready ? "fadeIn 0.2s ease-in-out" : undefined,
      }}
    >
      <div className=" shadow-xl rounded-lg overflow-hidden">
        <div
          ref={containerRef}
          className="emoji-picker-container max-h-[350px] w-[320px]"
        ></div>
      </div>
    </div>
  );

  return createPortal(content, portalElement);
};

export default EmojiPicker;
