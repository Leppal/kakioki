import type {
  MessageMetadata,
  MessageStatusMetadata,
} from "@/lib/types/TypesLogic";

export type ChatMessageEvent = {
  type: "chat_message";
  threadId: string;
  clientMessageId: string;
  fromId: number;
  toId: number;
  ciphertext: string;
  nonce: string;
  metadata: MessageMetadata;
  status: MessageStatusMetadata;
  createdAt: string;
  hasFullMetadata?: boolean;
};

export type ChatStatusEvent = {
  type: "chat_status";
  threadId: string;
  clientMessageId: string;
  actorId: number;
  status: MessageStatusMetadata;
  createdAt: string;
};

export type ChatControlEvent =
  | {
      type: "chat_block";
      threadId: string;
      blockerId: number;
      blockedId: number;
      createdAt: string;
    }
  | {
      type: "chat_unblock";
      threadId: string;
      blockerId: number;
      blockedId: number;
      createdAt: string;
    }
  | {
      type: "chat_removed";
      threadId: string;
      initiatorId: number;
      targetId: number;
      createdAt: string;
    };

export type ChatRealtimeEvent =
  | ChatMessageEvent
  | ChatStatusEvent
  | ChatControlEvent;

export function chatMessageChannel(threadId: string) {
  return `chat:thread:${threadId}`;
}

export function chatStatusChannel(threadId: string) {
  return `chat:status:${threadId}`;
}

export function chatControlChannel(threadId: string) {
  return `chat:control:${threadId}`;
}
