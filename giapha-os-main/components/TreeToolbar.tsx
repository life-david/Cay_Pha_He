import { Crosshair, ZoomIn, ZoomOut } from "lucide-react";
import BaseToolbar, { BaseToolbarProps } from "./BaseToolbar";
import { useState } from "react";

interface TreeToolbarProps extends BaseToolbarProps {
  scale: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleCenter: () => void;
  // maternal disease highlight controls
  maternalMode?: boolean;
  setMaternalMode?: (v: boolean) => void;
  clearMaternalOrigin?: () => void;
  maternalOriginName?: string | null;
  // disease selection
  diseases?: any[];
  activeDiseaseId?: string | null;
  setActiveDiseaseId?: (id: string | null) => void;
}

export default function TreeToolbar({
  scale,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  handleCenter,
  maternalMode,
  setMaternalMode,
  clearMaternalOrigin,
  maternalOriginName,
  diseases,
  activeDiseaseId,
  setActiveDiseaseId,
  ...baseProps
}: TreeToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <BaseToolbar {...baseProps}>
      {/* Zoom Controls */}
      <div className="flex items-center bg-white/80 backdrop-blur-md shadow-sm border border-stone-200/60 rounded-full overflow-hidden transition-opacity h-10">
        <button
          onClick={handleZoomOut}
          className="px-3 h-full hover:bg-stone-100/50 text-stone-600 transition-colors disabled:opacity-50"
          title="Thu nhỏ"
          disabled={scale <= 0.3}
        >
          <ZoomOut className="size-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2 h-full hover:bg-stone-100/50 text-stone-600 transition-colors text-xs font-medium min-w-[50px] text-center border-x border-stone-200/50"
          title="Đặt lại"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          className="px-3 h-full hover:bg-stone-100/50 text-stone-600 transition-colors disabled:opacity-50"
          title="Phóng to"
          disabled={scale >= 2}
        >
          <ZoomIn className="size-4" />
        </button>
      </div>

      {/* Center Button */}
      <button
        onClick={handleCenter}
        className="flex items-center justify-center size-10 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-stone-200/60 text-stone-600 hover:bg-white hover:text-stone-900 hover:shadow-md transition-all"
        title="Căn giữa"
      >
        <Crosshair className="size-4" />
      </button>

      {/* Maternal disease toggle */}
      <div className="flex items-center gap-2 relative">
        <button
          onClick={() => {
            // toggle menu when available, otherwise toggle maternal mode
            if (diseases && diseases.length > 0) {
              setMenuOpen((v) => !v);
            } else {
              setMaternalMode && setMaternalMode(!maternalMode);
            }
          }}
          className={`px-3 h-10 rounded-full shadow-sm border transition-colors ${maternalMode ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-white/80 border-stone-200 text-stone-600'}`}
          title="Bật/Tắt đánh dấu bệnh di truyền"
        >
          Bệnh di truyền
        </button>
        {menuOpen && diseases && (
          <div className="absolute top-full mt-2 right-0 w-64 bg-white border rounded-md shadow-lg z-50 p-2">
            <div className="text-xs text-stone-500 mb-2">Chọn loại bệnh để phân tích</div>
            <div className="space-y-1">
              {/* removed 'Không chọn' per user request */}
              {diseases.map((d: any) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setActiveDiseaseId && setActiveDiseaseId(d.id);
                    // ensure maternal highlighting is on
                    setMaternalMode && setMaternalMode(true);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded ${activeDiseaseId === d.id ? 'bg-amber-100' : 'hover:bg-stone-50'}`}
                >
                  <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: d.color ?? '#f97316' }} />{d.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {maternalOriginName && (
          <button
            onClick={() => clearMaternalOrigin && clearMaternalOrigin()}
            className="px-2 h-10 rounded-full bg-white/80 border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
            title="Xóa nguồn bệnh đã chọn"
          >
            Đã chọn: {maternalOriginName}
          </button>
        )}
      </div>
    </BaseToolbar>
  );
}
