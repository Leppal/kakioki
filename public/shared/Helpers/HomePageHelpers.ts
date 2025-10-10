"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthClientUI";

type ViewMode = "home" | "signin" | "signup";

export function UseHomePageLogic() {
  const [currentView, setCurrentView] = useState<ViewMode>("home");
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, login, signup, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/chat");
    }
  }, [isAuthenticated, router]);

  const handleSignIn = async (email: string, password: string) => {
    setError(null);

    try {
      const result = await login(email, password);

      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("An unexpected error occurred during sign in.");
    }
  };

  const handleSignUp = async (
    email: string,
    username: string,
    password: string
  ) => {
    setError(null);

    try {
      const result = await signup(email, username, password);

      if (result.success) {
        setCurrentView("signin");
      } else if (result.error) {
        setError(result.error);
      }
    } catch (error) {
      console.error("Sign up error:", error);
      setError("An unexpected error occurred during sign up.");
    }
  };

  return {
    currentView,
    setCurrentView,
    error,
    setError,
    isLoading,
    handleSignIn,
    handleSignUp,
  } as const;
}
