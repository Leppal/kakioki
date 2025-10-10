import type { MessageStatusMetadata } from "@/lib/types/TypesLogic";
import { decryptTextWithSharedKey } from "@/public/shared/Helpers/KeyHelpers";
import { decryptMediaDescriptors } from "@/public/shared/hooks/chatMedia";
import {
  applyStatusToMessage,
  cloneMetadata,
} from "@/public/shared/hooks/chatUtils";
import type {
  ChatMessage,
  MessageRecordInput,
} from "@/public/shared/hooks/chatTypes";

export function generateClientMessageId(): string {
  const cryptoObj =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj) {
    if (typeof cryptoObj.randomUUID === "function") {
      return cryptoObj.randomUUID();
    }
    if (typeof cryptoObj.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      cryptoObj.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0")
      );
      return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
        .slice(6, 8)
        .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
    }
  }
  const now = Date.now().toString(16);
  const rand = () => Math.random().toString(16).slice(2, 10);
  return `${now}-${rand()}-${rand()}`;
}

export async function decryptRecord(
  record: MessageRecordInput,
  sharedKey: Uint8Array
): Promise<ChatMessage> {
  let plaintext: string | null = null;
  try {
    plaintext = await decryptTextWithSharedKey(
      sharedKey,
      record.ciphertext,
      record.nonce
    );
  } catch (decryptError) {
    console.error("Message decrypt error", {
      messageId: record.id,
      clientMessageId: record.clientMessageId,
      cause:
        decryptError instanceof Error ? decryptError.message : decryptError,
    });
    plaintext = null;
  }
  const metadata = cloneMetadata(record.metadata ?? undefined);
  const status: MessageStatusMetadata = {
    ...(record.statusMetadata ?? record.status ?? {}),
  };
  const mediaDescriptors = metadata.media ?? [];
  metadata.media = mediaDescriptors;
  const media = await decryptMediaDescriptors(mediaDescriptors, sharedKey);
  const message: ChatMessage = {
    id: record.id,
    clientMessageId: record.clientMessageId,
    senderId: record.fromId,
    ciphertext: record.ciphertext,
    nonce: record.nonce,
    plaintext,
    metadata,
    media,
    status,
    createdAt: record.createdAt,
    state: "sent",
  };
  const nextState = applyStatusToMessage(message);
  return { ...message, state: nextState };
}
