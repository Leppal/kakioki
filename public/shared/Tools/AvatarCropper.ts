"use client";

import { useCallback, useRef, useState } from "react";
import type { Crop, PixelCrop } from "react-image-crop";

const TO_RADIANS = Math.PI / 180;

export function UseImageCropperLogic() {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | undefined>(
    undefined
  );
  const [scale, setScale] = useState(1.0);
  const initialCropRef = useRef<Crop | undefined>(undefined);
  const MAX_PERCENT = 80;

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const imgEl = e.currentTarget;
    const imgW = imgEl.naturalWidth || imgEl.width || 1;
    const imgH = imgEl.naturalHeight || imgEl.height || 1;

    const initialWidthPercent = 90;

    const requestedWidthPx = (initialWidthPercent / 100) * imgW;
    const maxPx = Math.min(imgW, imgH) * (MAX_PERCENT / 100);
    const initialPx = Math.min(requestedWidthPx, maxPx);

    const initialWidthPercentFinal = (initialPx / imgW) * 100;
    const initialHeightPercentFinal = (initialPx / imgH) * 100;

    const initialCrop: Crop = {
      unit: "%",
      width: initialWidthPercentFinal,
      height: initialHeightPercentFinal,
      x: Math.max(0, (100 - initialWidthPercentFinal) / 2),
      y: Math.max(0, (100 - initialHeightPercentFinal) / 2),
    } as Crop;

    initialCropRef.current = initialCrop;
    try {
      setCrop(initialCrop);
    } catch {
    }
  }

  const onImageClick = useCallback(() => {
    if (initialCropRef.current && !crop) {
      setCrop(initialCropRef.current);
    }
  }, [crop]);

  const clampPercentCrop = useCallback(
    (p: Crop) => {
      const img = imgRef.current;
      const imgW = img?.naturalWidth || 1;
      const imgH = img?.naturalHeight || 1;

      const wPercent = typeof p.width === "number" ? p.width : 100;
      const hPercent = typeof p.height === "number" ? p.height : 100;

      const reqWpx = (wPercent / 100) * imgW;
      const reqHpx = (hPercent / 100) * imgH;

      const maxPx = Math.min(imgW, imgH) * (MAX_PERCENT / 100);

      const newPx = Math.min(reqWpx, reqHpx, maxPx);

      const newWPercent = (newPx / imgW) * 100;
      const newHPercent = (newPx / imgH) * 100;

      let x = typeof p.x === "number" ? p.x : 0;
      let y = typeof p.y === "number" ? p.y : 0;

      x = Math.max(0, Math.min(x, 100 - newWPercent));
      y = Math.max(0, Math.min(y, 100 - newHPercent));

      return {
        ...p,
        width: newWPercent,
        height: newHPercent,
        x,
        y,
        unit: "%",
      } as Crop;
    },
    [imgRef]
  );

  const onCropChange = useCallback(
    (cropArg: Crop | undefined, percentCropArg?: Crop) => {
      const percentCrop = percentCropArg || cropArg;
      if (!percentCrop) return;
      const clamped = clampPercentCrop(percentCrop);
      setCrop(clamped);
    },
    [clampPercentCrop]
  );

  const canvasPreview = useCallback(
    async (
      image: HTMLImageElement,
      canvas: HTMLCanvasElement,
      cropParam: PixelCrop,
      scaleParam = 1,
      rotateParam = 0
    ) => {
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("No 2d context");
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const pixelRatio = window.devicePixelRatio;

      canvas.width = Math.floor(cropParam.width * scaleX * pixelRatio);
      canvas.height = Math.floor(cropParam.height * scaleY * pixelRatio);

      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = "high";

      const cropX = cropParam.x * scaleX;
      const cropY = cropParam.y * scaleY;

      const centerX = image.naturalWidth / 2;
      const centerY = image.naturalHeight / 2;

      ctx.save();

      ctx.translate(-cropX, -cropY);
      ctx.translate(centerX, centerY);
      ctx.rotate(rotateParam * TO_RADIANS);
      ctx.scale(scaleParam, scaleParam);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight
      );

      ctx.restore();
    },
    []
  );

  return {
    imgRef,
    previewCanvasRef,
    crop,
    setCrop,
    completedCrop,
    setCompletedCrop,
    scale,
    setScale,
    onCropChange,
    onImageClick,
    onImageLoad,
    canvasPreview,
  } as const;
}

export const createImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
};

export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, {
    type: blob.type,
    lastModified: Date.now(),
  });
};

export const resizeImageBlob = async (
  blob: Blob,
  maxWidth: number = 300,
  maxHeight: number = 300,
  quality: number = 0.9
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      const ratio = Math.min(maxWidth / width, maxHeight / height);

      if (ratio < 1) {
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (resultBlob) => {
          if (resultBlob) {
            resolve(resultBlob);
          } else {
            reject(new Error("Failed to create blob from canvas"));
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(blob);
  });
};
