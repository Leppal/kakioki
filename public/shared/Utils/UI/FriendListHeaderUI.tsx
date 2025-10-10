"use client";

import React from "react";
import { FriendItem } from "@/public/shared/Utils/UI/FriendListUsersUI";
import type { FriendListEntry } from "@/public/shared/hooks/useFriendRelationships";

interface FriendListHeaderProps {
  friends: FriendListEntry[];
  isLoading: boolean;
  onSelect?: (friend: FriendListEntry) => void;
}

export const FriendListHeader: React.FC<FriendListHeaderProps> = ({
  friends,
  isLoading,
  onSelect,
}) => {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const handleWheel = React.useCallback((event: WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;

    const canScrollHorizontally = el.scrollWidth > el.clientWidth;
    if (!canScrollHorizontally) return;

    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      el.scrollLeft += event.deltaY;
    }
  }, []);

  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const listener = (event: WheelEvent) => handleWheel(event);
    element.addEventListener("wheel", listener, { passive: true });
    return () => {
      element.removeEventListener("wheel", listener);
    };
  }, [handleWheel]);
  if (isLoading) {
    return (
      <div className="relative overflow-hidden">
        <div className="flex items-center gap-3 min-h-[80px] p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 text-amber-50/60 my-2 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-white/10" />
          <div className="flex-1 h-6 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="relative overflow-hidden">
        <div className="flex items-center justify-center min-h-[80px] p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 text-amber-50/60 my-2">
          <p className="text-center">You don&apos;t have any friends yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="relative w-full overflow-x-auto scrollbar-hide"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="min-h-[80px] p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 text-amber-50 my-2">
        <div className="flex flex-row items-center whitespace-nowrap">
          {friends.map((entry) => (
            <div key={entry.user.id} className="inline-block">
              <FriendItem
                friend={{
                  username: entry.user.username,
                  avatarUrl: entry.user.avatarUrl,
                }}
                onClick={() => onSelect?.(entry)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
