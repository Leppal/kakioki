import type { EncryptedMediaDescriptor } from "@/lib/types/TypesLogic";
import {
  encryptTextWithSharedKey,
  decryptTextWithSharedKey,
} from "@/public/shared/Helpers/KeyHelpers";
import type { UploadedMediaItem } from "@/public/shared/Logic/MediaHandler";
import type { DecryptedMedia } from "@/public/shared/hooks/chatTypes";

function getSubtleCrypto(): SubtleCrypto | null {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    globalThis.crypto.subtle
  ) {
    return globalThis.crypto.subtle;
  }
  return null;
}

async function computeDigestBase64(value: string): Promise<string | undefined> {
  const subtle = getSubtleCrypto();
  if (!subtle) {
    return undefined;
  }
  try {
    const data = new TextEncoder().encode(value);
    const hash = await subtle.digest("SHA-256", data);
    let binary = "";
    const bytes = new Uint8Array(hash);
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    if (typeof globalThis.btoa === "function") {
      return globalThis.btoa(binary);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function encryptMediaItems(
  sharedKey: Uint8Array,
  items: UploadedMediaItem[]
): Promise<{
  descriptors: EncryptedMediaDescriptor[];
  decrypted: DecryptedMedia[];
}> {
  const descriptors: EncryptedMediaDescriptor[] = [];
  const decrypted: DecryptedMedia[] = [];
  for (const item of items) {
    if (!item.url) {
      continue;
    }
    try {
      const { ciphertext, nonce } = await encryptTextWithSharedKey(
        sharedKey,
        item.url
      );
      const digest = await computeDigestBase64(item.url);
      const descriptor: EncryptedMediaDescriptor = {
        url: "",
        ciphertext,
        nonce,
        type: item.type,
        format: item.format,
        size: item.size,
        width: item.width,
        height: item.height,
        digest,
      };
      if (typeof item.thumbnail !== "undefined") {
        descriptor.thumbnail = item.thumbnail ?? null;
      }
      if (item.name) {
        descriptor.name = item.name;
      }
      descriptors.push(descriptor);
      decrypted.push({
        source: item.url,
        type: item.type,
        format: item.format,
        size: item.size,
        width: item.width,
        height: item.height,
        digest,
        thumbnail: item.thumbnail ?? null,
        name: item.name,
      });
    } catch (error) {
      console.error("Media encryption error:", error);
    }
  }
  return { descriptors, decrypted };
}

export function convertDecryptedToUploaded(
  items: DecryptedMedia[]
): UploadedMediaItem[] {
  return items
    .filter(
      (item) => item.source && (item.type === "image" || item.type === "video")
    )
    .map((item) => ({
      url: item.source,
      type: item.type === "video" ? "video" : "image",
      format: item.format,
      size: item.size,
      width: item.width,
      height: item.height,
      thumbnail:
        typeof item.thumbnail === "undefined" ? null : item.thumbnail ?? null,
      name: item.name,
    }));
}

export async function decryptMediaDescriptors(
  descriptors: EncryptedMediaDescriptor[] | undefined,
  sharedKey: Uint8Array
): Promise<DecryptedMedia[]> {
  if (!descriptors || descriptors.length === 0) {
    return [];
  }
  const results: DecryptedMedia[] = [];
  for (const descriptor of descriptors) {
    if (!descriptor.ciphertext || !descriptor.nonce) {
      continue;
    }
    try {
      const source = await decryptTextWithSharedKey(
        sharedKey,
        descriptor.ciphertext,
        descriptor.nonce
      );
      const type = descriptor.type === "file" ? "file" : descriptor.type;
      results.push({
        source,
        type,
        format: descriptor.format,
        size: descriptor.size,
        width: descriptor.width,
        height: descriptor.height,
        digest: descriptor.digest,
        thumbnail: descriptor.thumbnail ?? null,
        name: descriptor.name,
      });
    } catch (error) {
      console.error("Media decrypt error:", error);
    }
  }
  return results;
}
