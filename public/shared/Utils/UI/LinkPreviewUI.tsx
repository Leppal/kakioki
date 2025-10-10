"use client";

import React from "react";
import Image from "next/image";
import type { LinkPreview } from "@/lib/types/TypesLogic";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { UseWebsiteLinkPreviewLogic } from "@/public/shared/Tools/Linkify";

interface WebsiteLinkPreviewProps {
  preview: LinkPreview;
  className?: string;
}

export const WebsiteLinkPreview: React.FC<WebsiteLinkPreviewProps> = ({
  preview,
  className = "",
}) => {
  const { handleClick } = UseWebsiteLinkPreviewLogic(preview);

  return (
    <div
      className={`max-w-lg rounded-lg overflow-hidden bg-black/20 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {preview.image && (
        <div className="relative h-40 overflow-hidden">
          <Image
            src={preview.image}
            alt={preview.title || "Website preview"}
            width={600}
            height={160}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
            unoptimized
          />
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon
                icon={faGlobe}
                className="text-amber-50/60 text-xs flex-shrink-0"
              />
              <span className="text-xs text-amber-50/60 truncate">
                {preview.domain}
              </span>
            </div>

            <h4 className="text-sm font-medium text-amber-50 truncate mb-1">
              {preview.title || preview.url}
            </h4>

            {preview.description && (
              <p className="text-xs text-amber-50/70 line-clamp-2 mb-2">
                {preview.description}
              </p>
            )}

            <p className="text-xs text-amber-50/50 truncate">{preview.url}</p>
          </div>

          <div className="ml-2 flex-shrink-0">
            <FontAwesomeIcon
              icon={faExternalLinkAlt}
              className="text-amber-50/60 hover:text-amber-50 transition-colors text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
