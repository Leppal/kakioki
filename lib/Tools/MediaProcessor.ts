import { SharpConfig } from "./SharpConfig";
import {
  MediaType,
  MediaProcessingOptions,
  ProcessedMediaResult,
} from "../types/TypesLogic";

class MediaProcessor {
  async processMedia(
    buffer: Buffer,
    mediaType: MediaType,
    fileName: string,
    options: MediaProcessingOptions = {}
  ): Promise<ProcessedMediaResult> {
    const { maxWidth = 1280, maxHeight = 1280, quality = 80 } = options;

    if (mediaType === "image") {
      return this.processImage(buffer, fileName, {
        maxWidth,
        maxHeight,
        quality,
      });
    } else if (mediaType === "video") {
      return this.processVideo(buffer, fileName, {
        maxWidth,
        maxHeight,
        quality,
      });
    }

    throw new Error(`Unsupported media type: ${mediaType}`);
  }

  private async processImage(
    buffer: Buffer,
    fileName: string,
    options: MediaProcessingOptions
  ): Promise<ProcessedMediaResult> {
    try {
      const isGif = fileName.toLowerCase().endsWith(".gif");

      if (isGif) {
        try {
          const info = await SharpConfig.getImageInfo(buffer);
          return {
            buffer,
            format: info.format || "gif",
            width: info.width,
            height: info.height,
          };
        } catch (err) {
          console.error("Failed to read GIF metadata:", err);
          return {
            buffer,
            format: "gif",
            width: undefined,
            height: undefined,
          };
        }
      }

      const format = fileName.toLowerCase().endsWith(".png") ? "png" : "webp";

      const processed = await SharpConfig.processImage(buffer, {
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        quality: options.quality,
        format: format as "png" | "webp" | "jpeg",
        fit: "inside",
        withoutEnlargement: true,
      });

      return {
        buffer: processed.buffer,
        format: processed.format,
        width: processed.width,
        height: processed.height,
      };
    } catch (error) {
      console.error("Image processing error:", error);
      throw new Error(
        `Failed to process image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async processVideo(
    buffer: Buffer,
    fileName: string,
    options: MediaProcessingOptions
  ): Promise<ProcessedMediaResult> {
    try {
      const format = this.getVideoFormat(fileName);

      return {
        buffer,
        format,
        width: options.maxWidth,
        height: options.maxHeight,
      };
    } catch (error) {
      console.error("Video processing error:", error);
      throw new Error(
        `Failed to process video: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private getVideoFormat(fileName: string): string {
    const ext = fileName.toLowerCase().split(".").pop() || "mp4";
    const validFormats = ["mp4", "webm", "ogg", "mov"];
    return validFormats.includes(ext) ? ext : "mp4";
  }

  async handleJob(data: {
    buffer: Buffer | string;
    mediaType: MediaType;
    name: string;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    messageId?: number | string;
    userId?: number | string;
  }): Promise<{
    publicUrl: string | null;
    processed: ProcessedMediaResult | null;
  }> {
    const arrBuffer =
      typeof data.buffer === "string"
        ? Buffer.from(data.buffer, "base64")
        : (data.buffer as Buffer);

    const processed = await this.processMedia(
      arrBuffer,
      data.mediaType,
      data.name,
      {
        maxWidth: data.maxWidth,
        maxHeight: data.maxHeight,
        quality: data.quality,
      }
    );

    console.log("Processed media job", {
      name: data.name,
      size: processed.buffer.length,
      format: processed.format,
    });

    const storageUrl = process.env.STORAGE_UPLOAD_URL;
    let publicUrl: string | null = null;

    if (storageUrl) {
      const uploadWithRetries = async (body: BodyInit) => {
        const maxAttempts = 4;
        let attempt = 0;
        let lastErr: unknown = null;
        while (attempt < maxAttempts) {
          try {
            const res = await fetch(storageUrl, {
              method: "POST",
              headers: { "Content-Type": "application/octet-stream" },
              body,
            });
            if (!res.ok) {
              lastErr = new Error(`Upload failed, status=${res.status}`);
              if (res.status >= 500 && res.status < 600) {
                throw lastErr;
              }
              return null;
            }
            const json = await res.json().catch(() => null);
            return json || null;
          } catch (err) {
            lastErr = err;
            attempt++;
            const backoff = 200 * Math.pow(2, attempt);
            await new Promise((r) => setTimeout(r, backoff));
          }
        }
        console.error("Upload failed after retries", lastErr);
        return null;
      };

      try {
        const uploadBody = Buffer.from(processed.buffer);
        const json = await uploadWithRetries(uploadBody as unknown as BodyInit);
        const maybeUrl = json?.url;
        if (typeof maybeUrl === "string") {
          if (
            maybeUrl.startsWith("http://") ||
            maybeUrl.startsWith("https://") ||
            maybeUrl.startsWith("data:")
          ) {
            publicUrl = maybeUrl;
          } else {
            console.warn("Storage returned non-http/data URL, ignoring", {
              url: maybeUrl,
            });
          }
        }
      } catch (err) {
        console.error("Error uploading to storage:", err);
      }
    } else {
      publicUrl = `data:image/${
        processed.format
      };base64,${processed.buffer.toString("base64")}`;
    }

    try {
      const req = eval("require") as (n: string) => unknown;
      type RepoModule = {
        UserRepository?: unknown;
      };
      type RepoCtor = new () => {
        update: (id: number, d: Record<string, unknown>) => Promise<unknown>;
      };
      const repoMod = req("@/lib") as RepoModule;
      if (data.userId && repoMod && "UserRepository" in repoMod) {
        const UserRepository = repoMod.UserRepository as unknown as RepoCtor;
        const userRepo = new UserRepository();
        await userRepo.update(Number(data.userId), { avatar_url: publicUrl });
      }
    } catch (err) {
      console.error("Failed to update DB after media processing:", err);
    }

    return { publicUrl, processed };
  }
}

export const mediaProcessor = new MediaProcessor();
export default mediaProcessor;
