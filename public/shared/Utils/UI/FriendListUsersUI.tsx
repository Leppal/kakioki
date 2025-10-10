"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { SafeImage } from "@/public/shared/Utils/Props/MediaProps";

export const FriendItem: React.FC<{
  friend: { username: string; avatar_url?: string | null; avatarUrl?: string };
  onClick?: () => void;
}> = ({ friend, onClick }) => {
  const avatar = friend.avatar_url ?? friend.avatarUrl ?? undefined;
  return (
    <div
      className="relative flex-shrink-0 w-20 h-20 mx-2 cursor-pointer group bouncy-hover"
      onClick={onClick}
      title={friend.username}
      tabIndex={0}
    >
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/20 flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:transform group-hover:scale-110">
          {avatar ? (
            <div className="relative w-full h-full">
              <SafeImage
                src={avatar}
                alt={`${friend.username}'s avatar`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          ) : (
            <FontAwesomeIcon
              icon={faUser}
              size="lg"
              className="text-amber-50/70"
            />
          )}
        </div>
        <span className="text-xs text-amber-50 mt-1 truncate w-full text-center">
          {friend.username}
        </span>
      </div>
    </div>
  );
};
