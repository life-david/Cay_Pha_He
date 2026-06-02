"use client";

import React from "react";

export default function KinshipWarningModal({
  open,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-lg max-w-lg w-full p-6 z-10">
        <h3 className="text-lg font-semibold mb-2 text-amber-700">Cảnh báo quan hệ gần</h3>
        <p className="text-sm text-stone-600 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-white border text-stone-700 hover:bg-stone-50"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-700"
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}
