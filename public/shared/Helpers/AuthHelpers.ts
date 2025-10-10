export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("kakiokiToken");
}

export function getAuthHeaders(): { [key: string]: string } {
  const token = getAuthToken();
  const headers: { [key: string]: string } = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

import { useState, useCallback } from "react";

export const UseSignInForm = (
  onSubmit: (email: string, password: string) => void
) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (email && password) onSubmit(email, password);
    },
    [email, password, onSubmit]
  );

  return {
    email,
    setEmail,
    password,
    setPassword,
    handleSubmit,
  };
};

export const UseSignUpForm = (
  onSubmit: (email: string, username: string, password: string) => void
) => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (email && username && password && password === confirmPassword) {
        onSubmit(email, username, password);
      }
    },
    [email, username, password, confirmPassword, onSubmit]
  );

  const isFormValid = !!(
    email &&
    username &&
    password &&
    password === confirmPassword
  );

  return {
    email,
    setEmail,
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    handleSubmit,
    isFormValid,
  };
};
