"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/context/AuthClientUI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
const ChatInterface = dynamic(
  () =>
    import("@/public/shared/Utils/Interface/ChatInterface").then(
      (mod) => mod.ChatInterface
    ),
  { ssr: false }
);

export default function ChatPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FontAwesomeIcon
          icon={faSpinner}
          className="text-amber-50/70 animate-spin w-10 h-10"
        />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      {isAuthenticated && (
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <FontAwesomeIcon
                icon={faSpinner}
                className="text-amber-50/70 animate-spin w-10 h-10"
              />
            </div>
          }
        >
          <ChatInterface />
        </Suspense>
      )}
    </div>
  );
}
