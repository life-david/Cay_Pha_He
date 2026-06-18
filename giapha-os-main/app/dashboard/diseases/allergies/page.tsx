import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";

export default function AllergiesPage() {
  return (
    <div className="min-h-screen bg-[#fafaf9] selection:bg-amber-200 selection:text-amber-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/diseases" className="btn">
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
          <h1 className="title">Bệnh dị ứng (Di truyền qua nữ)</h1>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
          <p className="text-stone-600 mb-4">
            Đây là cấu hình hiện tại cho loại bệnh "Dị ứng". Ứng dụng sử dụng
            quy tắc: truyền chủ yếu qua dòng mẹ; con gái giữ nguyên xác suất từ
            mẹ, con trai nhận 50% xác suất, và truyền tiếp theo quy tắc tương tự.
          </p>

          <div className="space-y-4">
            <div className="p-4 border rounded-2xl">
              <h3 className="font-semibold">Quy tắc hiện tại</h3>
              <ul className="list-disc pl-5 text-sm text-stone-600 mt-2">
                <li>Nguồn nữ: xác suất 100%.</li>
                <li>Nguồn nam: người không dị ứng nhưng truyền cho con với 50%.</li>
                <li>Con gái nhận cùng xác suất với cha/mẹ; con trai nhận 50%.</li>
                <li>Truyền tiếp: giá trị xác suất của child là giá trị truyền cho các thế hệ sau.</li>
              </ul>
            </div>

            <div className="p-4 border rounded-2xl">
              <h3 className="font-semibold">Hành động</h3>
              <p className="text-sm text-stone-600">Hiện tại bạn có thể chọn nguồn trên cây gia phả để xem ảnh hưởng. Tương lai có thể thêm cấu hình, import/export, và báo cáo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
