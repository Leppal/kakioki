"use client";

import Ably from "ably";
import { getAuthHeaders } from "@/public/shared/Helpers/AuthHelpers";

type RealtimeClient = InstanceType<typeof Ably.Realtime>;

let realtimeClient: RealtimeClient | null = null;
let creatingClientPromise: Promise<RealtimeClient> | null = null;

async function createRealtimeClient(): Promise<RealtimeClient> {
  if (realtimeClient) {
    return realtimeClient;
  }

  if (!creatingClientPromise) {
    creatingClientPromise = (async () => {
      const client = new Ably.Realtime({
        authUrl: "/api/realtime/token",
        authMethod: "POST",
        authHeaders: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        authParams: {},
      });
      realtimeClient = client;
      return client;
    })();
  }

  return creatingClientPromise;
}

export async function getRealtimeClient(): Promise<RealtimeClient> {
  return createRealtimeClient();
}
