"use client";

import { User } from "@/lib/types/TypesLogic";

export async function refreshUser(
  userId: number,
  token: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const response = await fetch("/api/auth/me", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "unauthorized" };
      }
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data?.error || "Failed to refresh user" };
    }

    const data = await response.json();
    if (data?.success && data?.user) {
      return { success: true, user: data.user };
    }

    return { success: false, error: "Invalid response from server" };
  } catch (err) {
    console.error("refreshUser error:", err);
    return { success: false, error: "Network error" };
  }
}

export async function loginRequest(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data?.error || "Login failed" };
    }

    return { success: true, user: data.user, token: data.token };
  } catch (err) {
    console.error("loginRequest error:", err);
    return { success: false, error: "Network error" };
  }
}

export async function registerRequest(
  email: string,
  username: string,
  password: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data?.error || "Registration failed" };
    }

    return { success: true, user: data.user, token: data.token };
  } catch (err) {
    console.error("registerRequest error:", err);
    return { success: false, error: "Network error" };
  }
}

export async function uploadAvatar(
  file: File,
  userId: number
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId.toString());

    const response = await fetch("/api/auth/avatar", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data?.error || "Avatar upload failed" };
    }

    return { success: true, avatarUrl: data.avatarUrl };
  } catch (err) {
    console.error("uploadAvatar error:", err);
    return { success: false, error: "Network error" };
  }
}
