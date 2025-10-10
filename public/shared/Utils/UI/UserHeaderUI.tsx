// Test comment
"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { SafeImage } from "@/public/shared/Utils/Props/MediaProps";
import { AvatarUploadModal } from "@/public/shared/Utils/UI/AvatarUploadUI";
import { useAuth } from "@/lib/context/AuthClientUI";
import { useState, useCallback } from "react";

export const UserInfoHeader: React.FC = () => {
  const { logout, user } = useAuth();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const openAvatarModal = useCallback(() => setIsAvatarModalOpen(true), []);
  const closeAvatarModal = useCallback(() => setIsAvatarModalOpen(false), []);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-amber-50 cursor-default">
            Kakioki
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h3 className="text-sm font-semibold text-amber-50 cursor-default">
              {user ? user.username : "Your Username"}
            </h3>
            <button
              onClick={logout}
              className="text-xs text-amber-50/70 hover:text-amber-50 border-none cursor-pointer flex items-center gap-1 mt-1 no-theme"
            >
              <FontAwesomeIcon icon={faSignOutAlt} size="xs" />
              Logout
            </button>
          </div>
          <div
            className="w-10 h-10 rounded-full bg-white/5 border border-white/20 flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={openAvatarModal}
            title="Change profile picture"
          >
            {user?.avatarUrl ? (
              <div className="relative w-full h-full">
                {user.avatarUrl.startsWith("data:") ? (
                  <SafeImage
                    src={user.avatarUrl}
                    alt={`${user.username}'s avatar`}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <SafeImage
                    src={user.avatarUrl}
                    alt={`${user.username}'s avatar`}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                )}
              </div>
            ) : (
              <FontAwesomeIcon
                icon={faUser}
                size="lg"
                className="text-amber-50/70"
              />
            )}
          </div>
        </div>
      </div>

      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={closeAvatarModal}
      />
    </>
  );
};
