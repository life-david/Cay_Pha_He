import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import config from "@/app/config";
import DiseaseManager from "@/components/DiseaseManager";

export default function DiseasesPage() {
  return (
    <div className="min-h-screen bg-[#fafaf9] selection:bg-amber-200 selection:text-amber-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="btn">
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
          <h1 className="title">Bệnh di truyền</h1>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
          <p className="text-stone-600 mb-4">
            Trang quản lý các bệnh di truyền của {config.siteName}. Tại đây bạn
            có thể thêm những loại bệnh, cấu hình quy tắc truyền, và xem các
            phân tích ảnh hưởng trên cây gia phả.
          </p>

          <DiseaseManager />
        </div>
      </div>
    </div>
  );
}
