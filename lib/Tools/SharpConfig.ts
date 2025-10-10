import sharp from "sharp";
import os from "os";
import { Readable } from "stream";
import {
  ImageProcessingOptions,
  ProcessedImage,
  ImageFormat,
  DEFAULT_MAX_BYTES,
  MIN_ACCEPTED_BYTES,
  MAX_DIMENSION,
  clampQuality,
  formatToMime,
  formatFileSize,
  isValidImageType,
  getImageExtension,
} from "../types/TypesLogic";

try {
  const cpus = os.cpus()?.length || 1;
  sharp.concurrency(Math.max(1, Math.floor(cpus / 2)));
} catch {
  try {
    sharp.concurrency(1);
  } catch {}
}
try {
  sharp.cache(false);
} catch {}

export class SharpConfig {
  static async processImage(
    inputBuffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    if (
      !inputBuffer ||
      !(inputBuffer instanceof Buffer) ||
      inputBuffer.length === 0
    ) {
      throw new Error("Invalid image buffer: buffer is empty");
    }

    if (inputBuffer.length < MIN_ACCEPTED_BYTES) {
      throw new Error("Image buffer too small or corrupted");
    }

    if (inputBuffer.length > DEFAULT_MAX_BYTES) {
      throw new Error("Image buffer exceeds maximum allowed size");
    }

    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 80,
      format = "webp",
      fit = "inside",
      withoutEnlargement = true,
      rotate = true,
    } = options;

    const q = clampQuality(quality);

    try {
      let pipeline = sharp(inputBuffer);

      if (rotate) {
        pipeline = pipeline.rotate();
      }

      const metadata = await pipeline.metadata();

      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        throw new Error("Image dimensions exceed maximum allowed limits");
      }

      if (width > maxWidth || height > maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit,
          withoutEnlargement,
        });
      }

      pipeline = pipeline.toFormat(format, { quality: q });

      const processedBuffer: Buffer = await pipeline.toBuffer();

      const processedMetadata = await sharp(processedBuffer).metadata();

      return {
        buffer: processedBuffer,
        format: processedMetadata.format || format,
        mime: formatToMime(processedMetadata.format),
        width: processedMetadata.width || 0,
        height: processedMetadata.height || 0,
        size: processedBuffer.length,
        exif: processedMetadata.exif,
        orientation: processedMetadata.orientation,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Image processing failed (format=${options.format}, max=${options.maxWidth}x${options.maxHeight}): ${msg}`
      );
    }
  }

  static async createThumbnail(
    inputBuffer: Buffer,
    size: number = 150,
    outFormat: ImageFormat = "jpeg",
    quality: number = 80
  ): Promise<ProcessedImage> {
    if (!inputBuffer || inputBuffer.length === 0) {
      throw new Error("Invalid image buffer: buffer is empty");
    }

    try {
      const pipeline = sharp(inputBuffer)
        .rotate()
        .resize(size, size, {
          fit: "cover",
          position: "center",
        })
        .withMetadata()
        .toFormat(outFormat, { quality: clampQuality(quality) });

      const processedBuffer = await pipeline.toBuffer();

      const metadata = await sharp(processedBuffer).metadata();

      return {
        buffer: processedBuffer,
        format: metadata.format || outFormat,
        mime: formatToMime(metadata.format),
        width: metadata.width || size,
        height: metadata.height || size,
        size: processedBuffer.length,
        exif: metadata.exif,
        orientation: metadata.orientation,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Thumbnail creation failed: ${msg}`);
    }
  }

  static async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!(metadata.width && metadata.height && metadata.format);
    } catch {
      return false;
    }
  }

  static async getImageInfo(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    mime: string;
    size: number;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || "unknown",
        mime: formatToMime(metadata.format),
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to get image info: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  static formatFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  static isValidImageType(mimeType: string): boolean {
    return isValidImageType(mimeType);
  }

  static getImageExtension(mimeType: string): string {
    return getImageExtension(mimeType);
  }

  static async processImageFromStream(
    stream: Readable,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 80,
      format = "webp",
      fit = "inside",
      withoutEnlargement = true,
      rotate = true,
    } = options;
    const resultBuffer: Buffer = await new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let total = 0;
      stream.on("data", (chunk) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += buf.length;
        if (total > DEFAULT_MAX_BYTES) {
          stream.destroy();
          return reject(new Error("Image stream exceeds maximum allowed size"));
        }
        chunks.push(buf);
      });
      stream.on("end", async () => {
        try {
          const input = Buffer.concat(chunks);
          let s = sharp(input);
          if (rotate) s = s.rotate();
          const out = await s
            .resize(maxWidth, maxHeight, { fit, withoutEnlargement })
            .toFormat(format, { quality: clampQuality(quality) })
            .toBuffer();
          resolve(out);
        } catch (err) {
          reject(err);
        }
      });
      stream.on("error", (err) => reject(err));
    });

    return this.processImage(resultBuffer, options);
  }
}

export default SharpConfig;
