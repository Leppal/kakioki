"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/context/AuthClientUI";
import type { EncryptedMessageRecord } from "@/lib/types/TypesLogic";
import { getAuthHeaders } from "@/public/shared/Helpers/AuthHelpers";
import {
  deriveSharedKey,
  encryptTextWithSharedKey,
  ensurePrivateKeyAvailable,
} from "@/public/shared/Helpers/KeyHelpers";
import { processMediaForMessage } from "@/public/shared/Logic/MediaHandler";
import {
  encryptMediaItems,
  convertDecryptedToUploaded,
} from "@/public/shared/hooks/chatMedia";
import {
  cloneMetadata,
  mergeMessage,
  sortMessages,
} from "@/public/shared/hooks/chatUtils";
import {
  generateClientMessageId,
  decryptRecord,
} from "@/public/shared/hooks/chatEncryption";
import {
  BlockState,
  ChatMessage,
  DecryptedMedia,
  SendMessageOptions,
  SendMessageResult,
  UseChatReturn,
  UseChatState,
} from "@/public/shared/hooks/chatTypes";
import { initialiseChatRealtime } from "@/public/shared/hooks/chatRealtime";

export type {
  BlockState,
  ChatMessage,
  DecryptedMedia,
  SendMessageOptions,
  SendMessageResult,
  UseChatReturn,
  UseChatState,
} from "@/public/shared/hooks/chatTypes";

const MESSAGE_PAGE_SIZE = 50;

export function useChat({ friend }: UseChatState): UseChatReturn {
  const { user } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(
    friend?.threadId ?? null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isPrivateKeyReady, setIsPrivateKeyReady] = useState(false);
  const [friendPublicKey, setFriendPublicKey] = useState<string | null>(
    friend?.user.publicKey ?? null
  );
  const [blockState, setBlockState] = useState<BlockState>({
    blockedBySelf: friend?.blockedBySelf ?? false,
    blockedByFriend: friend?.blockedByFriend ?? false,
    createdAt: friend?.blockCreatedAt ?? null,
  });
  const [isThreadPreparing, setIsThreadPreparing] = useState(false);
  const loadSequenceRef = useRef(0);
  const activeFriendIdRef = useRef<number | null>(friend?.user.id ?? null);
  const activeThreadIdRef = useRef<string | null>(friend?.threadId ?? null);
  const sharedKeyCacheRef = useRef<Map<string, Uint8Array>>(new Map());
  const sharedKeyPromisesRef = useRef<Map<string, Promise<Uint8Array>>>(
    new Map()
  );
  const friendSharedKeyTokenRef = useRef<Map<number, string>>(new Map());
  const historyDecryptAbortRef = useRef<AbortController | null>(null);
  const realtimeDecryptAbortRef = useRef<AbortController | null>(null);

  const getCachedSharedKey = useCallback((targetFriendId: number) => {
    const token = friendSharedKeyTokenRef.current.get(targetFriendId);
    if (!token) {
      return null;
    }
    return sharedKeyCacheRef.current.get(token) ?? null;
  }, []);

  const fetchEncryptedMessage = useCallback(
    async (
      targetThreadId: string,
      clientMessageId: string
    ): Promise<EncryptedMessageRecord | null> => {
      try {
        const params = new URLSearchParams({
          threadId: targetThreadId,
          clientMessageId,
        });
        const response = await fetch(`/api/chat/message?${params.toString()}`, {
          headers: {
            ...getAuthHeaders(),
          },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Encrypted message fetch failed", {
            status: response.status,
            error: (errorData as { error?: string })?.error,
          });
          return null;
        }
        const data = await response.json().catch(() => ({}));
        return (
          (data as { message?: EncryptedMessageRecord | null })?.message ?? null
        );
      } catch (error) {
        console.error("Encrypted message fetch error", error);
        return null;
      }
    },
    []
  );

  const resetState = useCallback(() => {
    setMessages([]);
    setError(null);
    setHasMore(true);
    setIsLoading(false);
    setIsThreadPreparing(false);
    loadSequenceRef.current += 1;
    historyDecryptAbortRef.current?.abort();
    historyDecryptAbortRef.current = null;
    realtimeDecryptAbortRef.current?.abort();
    realtimeDecryptAbortRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;
    const initialiseKey = async () => {
      if (!user?.secretKeyEncrypted) {
        setIsPrivateKeyReady(false);
        return;
      }
      try {
        await ensurePrivateKeyAvailable(user.secretKeyEncrypted);
        if (active) {
          setIsPrivateKeyReady(true);
        }
      } catch (initialiseError) {
        if (active) {
          setIsPrivateKeyReady(false);
        }
        console.error("Private key initialisation failed:", initialiseError);
      }
    };
    void initialiseKey();
    return () => {
      active = false;
    };
  }, [user?.id, user?.secretKeyEncrypted]);

  useEffect(() => {
    sharedKeyCacheRef.current.clear();
    friendSharedKeyTokenRef.current.clear();
    sharedKeyPromisesRef.current.clear();
  }, [user?.id]);

  useEffect(() => {
    setThreadId(friend?.threadId ?? null);
    setBlockState({
      blockedBySelf: friend?.blockedBySelf ?? false,
      blockedByFriend: friend?.blockedByFriend ?? false,
      createdAt: friend?.blockCreatedAt ?? null,
    });
    resetState();
    setFriendPublicKey(friend?.user.publicKey ?? null);
    if (friend?.threadId) {
      setIsThreadPreparing(true);
    } else {
      setIsThreadPreparing(false);
    }
  }, [
    friend?.user.id,
    friend?.user.publicKey,
    friend?.threadId,
    friend?.blockedBySelf,
    friend?.blockedByFriend,
    friend?.blockCreatedAt,
    resetState,
  ]);

  useEffect(() => {
    activeFriendIdRef.current = friend?.user.id ?? null;
  }, [friend?.user.id]);

  useEffect(() => {
    activeThreadIdRef.current = threadId ?? null;
  }, [threadId]);

  const fetchFriendPublicKey = useCallback(async () => {
    if (!friend) {
      return null;
    }
    try {
      const response = await fetch(
        `/api/friend/profile?friendId=${friend.user.id}`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error(
          "Failed to fetch friend key:",
          data?.error || response.status
        );
        return null;
      }
      const key = (data?.friend?.publicKey as string | undefined) ?? null;
      if (key) {
        setFriendPublicKey(key);
      }
      return key;
    } catch (error) {
      console.error("Friend key fetch error:", error);
      return null;
    }
  }, [friend]);

  const ensureFriendPublicKey = useCallback(async () => {
    if (!friend) {
      throw new Error("Friend not selected");
    }
    if (friend.user.publicKey) {
      if (friendPublicKey !== friend.user.publicKey) {
        setFriendPublicKey(friend.user.publicKey);
      }
      return friend.user.publicKey;
    }
    if (friendPublicKey) {
      return friendPublicKey;
    }
    const fetched = await fetchFriendPublicKey();
    if (fetched) {
      return fetched;
    }
    throw new Error("Friend public key unavailable");
  }, [friend, friendPublicKey, fetchFriendPublicKey]);

  const ensureSharedKey = useCallback(async () => {
    if (!friend) {
      throw new Error("Missing friend key");
    }
    if (!user?.id) {
      throw new Error("User session missing");
    }
    const resolvedFriendKey = await ensureFriendPublicKey();
    const cacheToken = `${user.id}:${friend.user.id}:${resolvedFriendKey}`;
    const cached = sharedKeyCacheRef.current.get(cacheToken);
    if (cached) {
      friendSharedKeyTokenRef.current.set(friend.user.id, cacheToken);
      if (!isPrivateKeyReady) {
        setIsPrivateKeyReady(true);
      }
      return cached;
    }
    const existingToken = friendSharedKeyTokenRef.current.get(friend.user.id);
    if (existingToken && existingToken !== cacheToken) {
      friendSharedKeyTokenRef.current.delete(friend.user.id);
    }
    const pending = sharedKeyPromisesRef.current.get(cacheToken);
    if (pending) {
      const shared = await pending;
      friendSharedKeyTokenRef.current.set(friend.user.id, cacheToken);
      if (!isPrivateKeyReady) {
        setIsPrivateKeyReady(true);
      }
      return shared;
    }
    const derivationPromise = (async () => {
      try {
        await ensurePrivateKeyAvailable(user.secretKeyEncrypted);
      } catch (availabilityError) {
        console.error("Shared key derivation failed: private key unavailable", {
          userId: user.id,
          friendId: friend.user.id,
        });
        throw availabilityError;
      }
      if (!user.publicKey) {
        console.warn(
          "Proceeding without cached user public key; will derive from private key",
          {
            userId: user.id,
          }
        );
      }
      const selfPublicKey =
        user.publicKey && user.publicKey.length > 0
          ? user.publicKey
          : undefined;
      const derivedKey = await deriveSharedKey(
        user.id,
        friend.user.id,
        resolvedFriendKey,
        selfPublicKey
      );
      sharedKeyCacheRef.current.set(cacheToken, derivedKey);
      friendSharedKeyTokenRef.current.set(friend.user.id, cacheToken);
      if (!isPrivateKeyReady) {
        setIsPrivateKeyReady(true);
      }
      return derivedKey;
    })();
    sharedKeyPromisesRef.current.set(cacheToken, derivationPromise);
    try {
      const derived = await derivationPromise;
      return derived;
    } finally {
      sharedKeyPromisesRef.current.delete(cacheToken);
    }
  }, [ensureFriendPublicKey, friend, isPrivateKeyReady, user]);

  const loadHistory = useCallback(
    async (targetThreadId: string) => {
      const currentFriend = friend;
      if (!currentFriend) {
        return;
      }
      const requestFriendId = currentFriend.user.id;
      if (!requestFriendId) {
        return;
      }
      const requestId = loadSequenceRef.current + 1;
      loadSequenceRef.current = requestId;
      let expectedThreadId = targetThreadId;
      const isStale = () =>
        loadSequenceRef.current !== requestId ||
        activeFriendIdRef.current !== requestFriendId ||
        (activeThreadIdRef.current !== null &&
          activeThreadIdRef.current !== expectedThreadId);
      const aborter = new AbortController();
      historyDecryptAbortRef.current?.abort();
      historyDecryptAbortRef.current = aborter;
      setIsThreadPreparing(true);
      setIsLoading(true);
      try {
        const response = await fetch(`/api/chat/${targetThreadId}`, {
          headers: {
            ...getAuthHeaders(),
          },
        });
        const responseData = await response.json().catch(() => ({}));
        if (aborter.signal.aborted || isStale()) {
          return;
        }
        if (!response.ok) {
          throw new Error(
            (responseData as { error?: string })?.error ||
              `Failed to load chat (${response.status})`
          );
        }
        const data = responseData;
        const encryptedMessages = (data?.messages ??
          []) as EncryptedMessageRecord[];
        const sharedKey = await ensureSharedKey();
        if (aborter.signal.aborted || isStale()) {
          return;
        }
        const decryptedMessages = await Promise.all(
          encryptedMessages.map((record) => decryptRecord(record, sharedKey))
        );
        if (aborter.signal.aborted || isStale()) {
          return;
        }
        setMessages(sortMessages(decryptedMessages));
        setHasMore(encryptedMessages.length >= MESSAGE_PAGE_SIZE);
        const nextThreadId =
          (data?.thread?.threadId as string | undefined) ?? targetThreadId;
        expectedThreadId = nextThreadId ?? targetThreadId;
        if (aborter.signal.aborted || isStale()) {
          return;
        }
        setThreadId(nextThreadId);
        if (data?.thread?.block) {
          if (aborter.signal.aborted || isStale()) {
            return;
          }
          setBlockState({
            blockedBySelf: !!data.thread.block.blockedBySelf,
            blockedByFriend: !!data.thread.block.blockedByOther,
            createdAt: data.thread.block.createdAt ?? null,
          });
        }
      } catch (fetchError) {
        console.error("Chat history fetch error:", fetchError);
        if (!aborter.signal.aborted && !isStale()) {
          setError("Unable to load conversation");
        }
      } finally {
        if (!aborter.signal.aborted && !isStale()) {
          setIsLoading(false);
          setIsThreadPreparing(false);
        }
        if (historyDecryptAbortRef.current === aborter) {
          historyDecryptAbortRef.current = null;
        }
      }
    },
    [ensureSharedKey, friend]
  );

  useEffect(() => {
    if (!friend || !threadId) {
      return;
    }
    const resolvedFriendKey = friend.user.publicKey ?? friendPublicKey;
    if (!resolvedFriendKey) {
      return;
    }
    loadHistory(threadId);
  }, [friend, friendPublicKey, threadId, loadHistory]);

  const updateBlockState = useCallback((update: Partial<BlockState>) => {
    setBlockState((prev) => ({
      blockedBySelf: update.blockedBySelf ?? prev.blockedBySelf,
      blockedByFriend: update.blockedByFriend ?? prev.blockedByFriend,
      createdAt: update.createdAt ?? prev.createdAt,
    }));
  }, []);

  useEffect(() => {
    if (!threadId || !friend || !user?.id) {
      return undefined;
    }
    const resolvedFriendKey = friend.user.publicKey ?? friendPublicKey;
    if (!resolvedFriendKey) {
      return undefined;
    }
    const cleanup = initialiseChatRealtime({
      threadId,
      friend,
      userId: user.id,
      ensureSharedKey,
      fetchEncryptedMessage,
      updateBlockState,
      resetState,
      setThreadId,
      setError,
      setMessages,
      realtimeDecryptAbortRef,
      historyDecryptAbortRef,
    });
    return cleanup;
  }, [
    threadId,
    friend,
    friendPublicKey,
    user?.id,
    ensureSharedKey,
    updateBlockState,
    resetState,
    fetchEncryptedMessage,
    setThreadId,
    setError,
    setMessages,
  ]);

  const sendMessage = useCallback(
    async (
      text: string,
      options?: SendMessageOptions
    ): Promise<SendMessageResult> => {
      if (!friend || !user?.id) {
        return { success: false, error: "Friend not selected" };
      }
      if (blockState.blockedBySelf || blockState.blockedByFriend) {
        return { success: false, error: "Messaging is blocked" };
      }
      try {
        await ensureFriendPublicKey();
      } catch (friendKeyError) {
        console.error("Friend public key unavailable:", friendKeyError);
        return { success: false, error: "Friend public key unavailable" };
      }
      const clientMessageId =
        options?.clientMessageId ?? generateClientMessageId();
      const createdAt = options?.createdAt ?? new Date().toISOString();
      try {
        const sharedKey = await ensureSharedKey();
        const metadata = cloneMetadata(options?.metadata);
        let decryptedMedia: DecryptedMedia[] = [];
        const attachments =
          options?.attachments && options.attachments.length > 0
            ? options.attachments
            : undefined;
        if (attachments) {
          const prepared = await encryptMediaItems(sharedKey, attachments);
          if (prepared.descriptors.length === 0) {
            throw new Error("Unable to prepare media attachments");
          }
          metadata.media = prepared.descriptors;
          decryptedMedia = prepared.decrypted;
        } else if (options?.mediaPreviews && options.mediaPreviews.length > 0) {
          const uploadedMedia = await processMediaForMessage(
            options.mediaPreviews
          );
          const prepared = await encryptMediaItems(sharedKey, uploadedMedia);
          if (prepared.descriptors.length === 0) {
            throw new Error("Unable to prepare media attachments");
          }
          metadata.media = prepared.descriptors;
          decryptedMedia = prepared.decrypted;
        }
        const { ciphertext, nonce } = await encryptTextWithSharedKey(
          sharedKey,
          text
        );
        const optimistic: ChatMessage = {
          clientMessageId,
          senderId: user.id,
          ciphertext,
          nonce,
          plaintext: text,
          metadata,
          media: decryptedMedia,
          status: {
            ...(options?.status ?? {}),
            delivery: "sending",
            sentAt: createdAt,
          },
          createdAt,
          state: "sending",
        };
        setMessages((prev) => mergeMessage(prev, optimistic));
        setIsSending(true);
        const response = await fetch("/api/chat/send", {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            threadId,
            toUserId: friend.user.id,
            clientMessageId,
            ciphertext,
            nonce,
            metadata,
            status: options?.status ?? {},
          }),
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Failed to send message");
        }
        const stored = data.message as EncryptedMessageRecord;
        const storedThreadId =
          (data.threadId as string | undefined) ?? threadId;
        if (storedThreadId && storedThreadId !== threadId) {
          setThreadId(storedThreadId);
        }
        const shared = getCachedSharedKey(friend.user.id) ?? sharedKey;
        const finalized = await decryptRecord(stored, shared);
        setMessages((prev) => mergeMessage(prev, finalized));
        return { success: true, message: finalized };
      } catch (sendError) {
        console.error("Send message error:", sendError);
        setMessages((prev) =>
          prev.map((message) =>
            message.clientMessageId === clientMessageId
              ? {
                  ...message,
                  state: "error",
                  error: (sendError as Error).message,
                  status: {
                    ...message.status,
                    delivery: "failed",
                    errorCode: (sendError as Error).name,
                  },
                }
              : message
          )
        );
        return { success: false, error: (sendError as Error).message };
      } finally {
        setIsSending(false);
      }
    },
    [
      blockState.blockedByFriend,
      blockState.blockedBySelf,
      ensureFriendPublicKey,
      ensureSharedKey,
      friend,
      getCachedSharedKey,
      threadId,
      user,
    ]
  );

  const retryMessage = useCallback(
    async (clientMessageId: string): Promise<SendMessageResult> => {
      const message = messages.find(
        (item) => item.clientMessageId === clientMessageId
      );
      if (!message || !message.plaintext) {
        return { success: false, error: "Message not found" };
      }
      setMessages((prev) =>
        prev.map((item) =>
          item.clientMessageId === clientMessageId
            ? { ...item, state: "sending", error: undefined }
            : item
        )
      );
      const attachments = convertDecryptedToUploaded(message.media);
      return sendMessage(message.plaintext, {
        metadata: message.metadata,
        status: { ...message.status, delivery: "sending" },
        clientMessageId,
        createdAt: message.createdAt,
        attachments,
      });
    },
    [messages, sendMessage]
  );

  const markAsRead = useCallback(
    async (clientMessageIds: string[]) => {
      if (!threadId || clientMessageIds.length === 0) {
        return;
      }
      try {
        await fetch("/api/chat/status", {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            threadId,
            messageIds: clientMessageIds,
            status: { delivery: "read" },
          }),
        });
        setMessages((prev) =>
          prev.map((message) =>
            clientMessageIds.includes(message.clientMessageId)
              ? {
                  ...message,
                  status: {
                    ...message.status,
                    delivery: "read",
                    readAt: new Date().toISOString(),
                  },
                  state: "read",
                }
              : message
          )
        );
      } catch (statusError) {
        console.error("Mark as read error:", statusError);
      }
    },
    [threadId]
  );

  const blockFriend = useCallback(async () => {
    if (!friend) {
      return false;
    }
    try {
      const response = await fetch("/api/chat/block", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          threadId,
          targetUserId: friend.user.id,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Block failed");
      }
      if (data.threadId && data.threadId !== threadId) {
        setThreadId(data.threadId as string);
      }
      updateBlockState({
        blockedBySelf: true,
        createdAt: new Date().toISOString(),
      });
      return true;
    } catch (blockError) {
      console.error("Block friend error:", blockError);
      return false;
    }
  }, [friend, threadId, updateBlockState]);

  const unblockFriend = useCallback(async () => {
    if (!friend) {
      return false;
    }
    try {
      const response = await fetch("/api/chat/unblock", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          threadId,
          targetUserId: friend.user.id,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unblock failed");
      }
      if (data.threadId && data.threadId !== threadId) {
        setThreadId(data.threadId as string);
      }
      updateBlockState({ blockedBySelf: false, createdAt: null });
      return true;
    } catch (unblockError) {
      console.error("Unblock friend error:", unblockError);
      return false;
    }
  }, [friend, threadId, updateBlockState]);

  const removeFriend = useCallback(async () => {
    if (!friend) {
      return false;
    }
    try {
      const response = await fetch("/api/chat/remove", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          threadId,
          targetUserId: friend.user.id,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Remove friend failed");
      }
      setMessages([]);
      updateBlockState({
        blockedBySelf: false,
        blockedByFriend: false,
        createdAt: null,
      });
      return true;
    } catch (removeError) {
      console.error("Remove friend error:", removeError);
      return false;
    }
  }, [friend, threadId, updateBlockState]);

  const loadLatest = useCallback(async () => {
    if (threadId) {
      await loadHistory(threadId);
    }
  }, [loadHistory, threadId]);

  const isBlocked = useMemo(
    () => blockState.blockedBySelf || blockState.blockedByFriend,
    [blockState.blockedByFriend, blockState.blockedBySelf]
  );

  return {
    threadId,
    messages,
    isLoading,
    isPreparing: isThreadPreparing,
    isSending,
    hasMore,
    isBlocked,
    blockState,
    error,
    sendMessage,
    retryMessage,
    markAsRead,
    blockFriend,
    unblockFriend,
    removeFriend,
    loadLatest,
  };
}
