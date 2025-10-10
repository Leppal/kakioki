"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

interface SafeImageProps extends Omit<ImageProps, "onError"> {
  fallbackIcon?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  fallbackIcon = true,
  alt,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError && fallbackIcon) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <FontAwesomeIcon icon={faUser} size="lg" className="text-amber-50/70" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded">
        <span className="text-xs text-gray-500">Image unavailable</span>
      </div>
    );
  }

  if (typeof props.src === "string" && props.src.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={props.src as string}
        alt={alt}
        className={props.className}
        style={props.style}
        onError={() => setHasError(true)}
      />
    );
  }

  return <Image {...props} alt={alt} onError={() => setHasError(true)} />;
};
