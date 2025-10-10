"use client";

import React from "react";
import { SignInForm } from "@/public/shared/Utils/Interface/SignInForm";
import { SignUpForm } from "@/public/shared/Utils/Interface/SignUpForm";
import { UseHomePageLogic } from "@/public/shared/Helpers/HomePageHelpers";

export default function HomePage() {
  const {
    currentView,
    setCurrentView,
    error,
    isLoading,
    handleSignIn,
    handleSignUp,
  } = UseHomePageLogic();

  const renderContent = () => {
    switch (currentView) {
      case "signin":
        return (
          <SignInForm
            onSubmit={handleSignIn}
            onSwitchToSignUp={() => setCurrentView("signup")}
            isLoading={isLoading}
          />
        );
      case "signup":
        return (
          <SignUpForm
            onSubmit={handleSignUp}
            onSwitchToSignIn={() => setCurrentView("signin")}
            isLoading={isLoading}
          />
        );
      default:
        return (
          <div className="max-w-md w-full bg-black/20 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl p-8 cursor-default">
            <div className="text-center">
              <h1
                className="font-bold text-amber-50 mb-2"
                style={{ fontSize: "clamp(3vh, 1vw, 10rem)" }}
              >
                Kakioki
              </h1>
              <p
                className=" text-amber-50 mb-8"
                style={{ fontSize: "clamp(2vh, 1vw, 10rem)" }}
              >
                Simple, light, fast, and secure.
              </p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => setCurrentView("signin")}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-amber-50 py-3 px-4 rounded-lg transition-colors duration-233 border-none cursor-pointer text-responsive signin-btn"
                  style={{ fontSize: "clamp(2vh, 1vw, 10rem)" }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setCurrentView("signup")}
                  className="w-full bg-gray-300 hover:bg-gray-200 text-gray-800 hover:text-gray-900 py-3 px-4 rounded-lg transition-colors duration-233 border-none cursor-pointer text-responsive signup-btn"
                  style={{ fontSize: "clamp(2vh, 1vw, 10rem)" }}
                >
                  Create Account
                </button>
              </div>
              <div className="mt-8 text-responsive text-amber-50"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 backdrop-blur-lg">
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 p-3 bg-red-500/80 backdrop-blur-sm text-white rounded-lg max-w-md w-full z-50">
          {error}
        </div>
      )}
      {renderContent()}
      {currentView !== "home" && (
        <button
          onClick={() => setCurrentView("home")}
          className="absolute top-4 left-4 text-amber-50 hover:text-blue-200 transition-colors duration-200 bg-transparent border-none cursor-pointer z-40"
          style={{ fontSize: "clamp(2vh, 1vw, 10rem)" }}
        >
          ← Back to Home
        </button>
      )}
    </div>
  );
}
