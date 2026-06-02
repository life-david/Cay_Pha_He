"use client";

import React from "react";
import { useDiseaseContext } from "./DiseaseContext";

export default function DiseasePickerModal({
  personId,
  onClose,
  categoryFilter,
  onAssign,
}: {
  personId: string;
  onClose: () => void;
  categoryFilter?: string | null;
  onAssign?: (personId: string, diseaseId: string | null, added: boolean) => void;
}) {
  const { diseases, assignDiseaseToPerson, getAssignedDiseases } = useDiseaseContext();

  const assigned = getAssignedDiseases(personId).map((d) => d.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-60 w-full max-w-xl p-4 bg-white rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Chọn bệnh cho thành viên</h3>
          <button className="btn-sm" onClick={onClose}>Đóng</button>
        </div>

        {(!diseases || diseases.length === 0) ? (
          <div className="text-sm text-stone-500">Chưa có bệnh nào. Hãy thêm trong Dashboard → Bệnh di truyền.</div>
        ) : (
          <div className="grid gap-3">
            {diseases
              .filter((d: any) => (categoryFilter ? d.category === categoryFilter : true))
              .map((d: any) => (
              <div key={d.id} className="p-3 border rounded flex items-center justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: d.color ?? '#f97316' }} />{d.name}</div>
                  <div className="text-xs text-stone-500">{d.notes}</div>
                  <div className="text-xs text-stone-400 mt-1">Quy tắc: {d.rules.maternal ? 'Mẫu' : 'Tùy'}. Nam: {d.rules.maleFactor*100}% Nữ: {d.rules.femaleFactor*100}%</div>
                </div>
                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={assigned.includes(d.id)}
                      onChange={() => {
                        const was = assigned.includes(d.id);
                        assignDiseaseToPerson(personId, d.id);
                        if (onAssign) onAssign(personId, d.id, !was);
                      }}
                    />
                    <span className="text-sm">Gán</span>
                  </label>
                </div>
              </div>
            ))}

            <div className="p-3 border rounded flex items-center justify-between">
              <div className="text-sm text-stone-600">Gỡ tất cả bệnh khỏi người này</div>
              <div>
                <button
                  onClick={() => {
                    // clear all
                    assignDiseaseToPerson(personId, null);
                    onClose();
                  }}
                  className="btn-sm bg-red-50 text-red-600 border-red-100"
                >
                  Bỏ tất cả
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
