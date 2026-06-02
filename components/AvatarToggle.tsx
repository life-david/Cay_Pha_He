"use client";

import { Eye, EyeOff } from "lucide-react";
import { useDashboard } from "./DashboardContext";

export default function AvatarToggle() {
  const { showAvatar, setShowAvatar } = useDashboard();

  const toggleAvatar = () => {
    setShowAvatar(!showAvatar);
  };

  return (
    <button onClick={toggleAvatar} className="btn">
      {showAvatar ? (
        <EyeOff className="size-4 shrink-0" />
      ) : (
        <Eye className="size-4 shrink-0" />
      )}
      <span className="inline-block tracking-wide min-w-max">
        {showAvatar ? "Ẩn ảnh" : "Hiện ảnh"}
      </span>
    </button>
  );
}
