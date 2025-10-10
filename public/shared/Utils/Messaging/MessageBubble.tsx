"use client";
import React, { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCheckDouble,
  faCircleExclamation,
  faClock,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";
import { TextWithLinks } from "@/public/shared/Tools/Linkify";
import { LinkPreview } from "@/public/shared/Utils/Props/LinkPreviewProps";
import { InlineVideoPlayer } from "@/public/shared/Utils/UI/InlineVideoPlayer";
import type { ChatMessage } from "@/public/shared/hooks/useChat";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onRetry?: (clientMessageId: string) => void;
  onMediaPreview?: (source: string) => void;
}

const resolveMediaGridClass = (count: number): string => {
  if (count === 1) {
    return "media-preview-grid-1";
  }
  if (count === 2) {
    return "media-preview-grid-2";
  }
  if (count === 3) {
    return "media-preview-grid-3";
  }
  if (count >= 4) {
    return "media-preview-grid-4";
  }
  return "media-preview-grid-2";
};

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onRetry,
  onMediaPreview,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const formattedTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(message.createdAt));
    } catch {
      return message.createdAt;
    }
  }, [message.createdAt]);

  const bubbleAlignment = isOwn ? "justify-end" : "justify-start";
  const bubbleStyle = isOwn
    ? "bg-gradient-to-b from-[#00B2ED] via-[#00BEED] to-[#59E6FF]"
    : "bg-gradient-to-b from-[#8A8A8A] via-[#DEDEDE] to-[#F0F0F0]";
  const bubbleCorners = isOwn
    ? "rounded-[25px] rounded-br-none"
    : "rounded-[25px] rounded-bl-none";

  const statusIcon = useMemo(() => {
    if (!isOwn) {
      return null;
    }
    if (message.state === "error") {
      return faCircleExclamation;
    }
    if (message.state === "sending") {
      return faClock;
    }
    if (message.state === "read") {
      return faCheckDouble;
    }
    if (message.state === "delivered") {
      return faCheckDouble;
    }
    if (message.state === "sent") {
      return faCheck;
    }
    return faCheck;
  }, [isOwn, message.state]);

  const textContent = message.plaintext ?? "Encrypted message unavailable";
  const mediaItems = message.media ?? [];
  const linkPreviews = message.metadata?.previews ?? [];
  const showRetry = isOwn && message.state === "error" && onRetry;
  const statusColor = "text-black/60";

  useEffect(() => {
    const root = containerRef.current;
    if (!root) {
      return undefined;
    }
    const videos = Array.from(root.querySelectorAll("video"));
    if (videos.length === 0) {
      return undefined;
    }
    const wheelHandler = () => undefined;
    const touchStartHandler = () => undefined;
    const touchMoveHandler = () => undefined;
    videos.forEach((video) => {
      video.addEventListener("wheel", wheelHandler, { passive: true });
      video.addEventListener("touchstart", touchStartHandler, {
        passive: true,
      });
      video.addEventListener("touchmove", touchMoveHandler, { passive: true });
    });
    return () => {
      videos.forEach((video) => {
        video.removeEventListener("wheel", wheelHandler);
        video.removeEventListener("touchstart", touchStartHandler);
        video.removeEventListener("touchmove", touchMoveHandler);
      });
    };
  }, [mediaItems.length, message.clientMessageId]);

  return (
    <div className={`flex ${bubbleAlignment}`}>
      <div ref={containerRef} className="relative max-w-[70%]">
        <div
          className={`${bubbleStyle} ${bubbleCorners} px-4 py-3 shadow-[0_5px_5px_rgba(0,0,0,0.35)] space-y-2 relative overflow-hidden`}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1 right-1 top-0.5 h-14 rounded-t-[25px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)0%,rgba(255,255,255,0.58)42%,rgba(255,255,255,0.12)75%,rgba(255,255,255,0)100%)]" />
          </div>
          {mediaItems.length > 0 ? (
            <div className="relative z-10">
              <div
                className={`media-preview-grid mx-auto ${resolveMediaGridClass(
                  mediaItems.length
                )}`}
              >
                {mediaItems.map((item, index) => {
                  const key = `${
                    item.digest ?? item.source ?? "media"
                  }-${index}`;
                  if (item.type === "image") {
                    return (
                      <div
                        key={key}
                        className="media-preview-item group cursor-pointer"
                      >
                        <button
                          type="button"
                          onClick={() => onMediaPreview?.(item.source)}
                          className="relative block h-full w-full overflow-hidden transition-transform duration-200 hover:scale-[1.02]"
                        >
                          <Image
                            src={item.source}
                            alt={item.name ?? "Encrypted image"}
                            width={item.width ?? 800}
                            height={item.height ?? 600}
                            className="h-full w-full max-h-80 sm:max-h-[24rem] object-cover"
                            sizes="(max-width: 768px) 70vw, 320px"
                            unoptimized
                          />
                        </button>
                      </div>
                    );
                  }
                  if (item.type === "video") {
                    return (
                      <div
                        key={key}
                        className="media-preview-item media-preview-item-video group cursor-pointer"
                      >
                        <div className="relative block h-full w-full overflow-hidden transition-transform duration-200 hover:scale-[1.02]">
                          <InlineVideoPlayer
                            source={item.source}
                            poster={item.thumbnail ?? undefined}
                            className="h-full w-full max-h-[30rem] sm:max-h-[34rem]"
                            forceCompactControls={mediaItems.length > 1}
                          />
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          ) : null}
          <TextWithLinks
            text={textContent}
            maxUrlLength={45}
            className={
              message.plaintext
                ? "text-black relative z-10 cursor-default break-words"
                : "italic text-black/60 relative z-10 cursor-default break-words"
            }
          />
          {linkPreviews.length > 0 ? (
            <div className="mt-1 space-y-2 relative z-10">
              {linkPreviews.map((preview) => (
                <LinkPreview
                  key={preview.url}
                  preview={preview}
                  className="max-w-xs"
                />
              ))}
            </div>
          ) : null}
          <div
            className={`flex items-center justify-between text-xs ${statusColor} relative z-10`}
          >
            <span className="cursor-default mr-1">{formattedTime}</span>
            <span className="flex items-center gap-2">
              {statusIcon ? (
                <FontAwesomeIcon icon={statusIcon} size="sm" />
              ) : null}
              {showRetry ? (
                <button
                  type="button"
                  onClick={() => onRetry?.(message.clientMessageId)}
                  className="px-2 py-1 rounded bg-red-500/20 text-red-100 hover:bg-red-500/30 transition"
                >
                  <FontAwesomeIcon icon={faRotateRight} size="sm" />
                </button>
              ) : null}
            </span>
          </div>
          {message.error ? (
            <div className="text-xs text-red-400/90 relative z-10">
              {message.error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const MessageBubble = React.memo(MessageBubbleComponent);
MessageBubble.displayName = "MessageBubble";
