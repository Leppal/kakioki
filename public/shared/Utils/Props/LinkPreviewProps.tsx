"use client";

import React from "react";
import type { LinkPreview as LinkPreviewType } from "@/lib/types/TypesLogic";
import { YouTubePreview } from "@/public/shared/Utils/UI/YouTubePreviewUI";
import { WebsiteLinkPreview } from "@/public/shared/Utils/UI/LinkPreviewUI";

interface LinkPreviewProps {
  preview: LinkPreviewType;
  className?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({
  preview,
  className = "",
}) => {
  if (preview.type === "youtube") {
    return <YouTubePreview preview={preview} className={className} />;
  }

  return <WebsiteLinkPreview preview={preview} className={className} />;
};
