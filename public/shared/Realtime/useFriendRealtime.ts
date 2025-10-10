"use client";

import { useEffect, useRef } from "react";
import type { FriendRealtimeEvent } from "@/lib/Realtime/FriendEvents";
import { friendChannel } from "@/lib/Realtime/FriendEvents";
import { useAuth } from "@/lib/context/AuthClientUI";
import { getRealtimeClient } from "@/public/shared/Realtime/ablyClient";

type AblyChannel = {
  subscribe: (listener: (message: { data: unknown }) => void) => void;
  unsubscribe: (listener: (message: { data: unknown }) => void) => void;
};

export function useFriendRealtime(
  onEvent: (event: FriendRealtimeEvent) => void
) {
  const { user } = useAuth();
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let isActive = true;
    let channel: AblyChannel | null = null;
    let listener: ((message: { data: unknown }) => void) | null = null;

    const subscribe = async () => {
      try {
        const client = await getRealtimeClient();
        if (!isActive) {
          return;
        }
        channel = client.channels.get(friendChannel(user.id)) as AblyChannel;
        if (!channel) {
          return;
        }
        listener = (message) => {
          const payload = message.data as FriendRealtimeEvent;
          handlerRef.current(payload);
        };
        channel.subscribe(listener);
      } catch (error) {
        console.error("Friend realtime subscription error:", error);
      }
    };

    subscribe();

    return () => {
      isActive = false;
      if (channel && listener) {
        channel.unsubscribe(listener);
      }
    };
  }, [user]);
}
