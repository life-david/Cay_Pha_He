import Footer from "@/components/Footer";
import { promises as fs } from "fs";
import { ArrowLeft, Database, Play } from "lucide-react";
import Link from "next/link";
import path from "path";
import CopyButton from "./CopyButton";

export default async function SetupPage() {
  let schemaContent = "";
  let legacySchemaContent = "";
  let legacySeedContent = "";
  try {
    const schemaPath = path.join(process.cwd(), "docs", "schema.sql");
    schemaContent = await fs.readFile(schemaPath, "utf-8");
  } catch (error) {
    console.error("Error reading schema.sql:", error);
    schemaContent =
      "-- Lỗi: Không thể đọc file docs/schema.sql. Vui lòng kiểm tra lại mã nguồn.";
  }

  try {
    const legacySchemaPath = path.join(process.cwd(), "caygiapha.sql");
    legacySchemaContent = await fs.readFile(legacySchemaPath, "utf-8");
  } catch (error) {
    console.error("Error reading caygiapha.sql:", error);
    legacySchemaContent =
      "-- Lỗi: Không thể đọc file caygiapha.sql. Vui lòng kiểm tra lại mã nguồn.";
  }

  try {
    const legacySeedPath = path.join(process.cwd(), "docs", "legacy-seed.sql");
    legacySeedContent = await fs.readFile(legacySeedPath, "utf-8");
  } catch (error) {
    console.error("Error reading legacy-seed.sql:", error);
    legacySeedContent =
      "-- Lỗi: Không thể đọc file docs/legacy-seed.sql. Vui lòng tạo file seed legacy trước.";
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] select-none selection:bg-amber-200 selection:text-amber-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none"></div>
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none flex justify-center">
        <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-indigo-300/20 rounded-full blur-[100px] mix-blend-multiply" />
        <div className="absolute bottom-[0%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-teal-200/20 rounded-full blur-[120px] mix-blend-multiply" />
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-12 relative z-10 w-full max-w-5xl mx-auto">
        <div className="w-full bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-stone-200 relative overflow-hidden mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Database className="size-8" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                Khởi tạo Cơ sở dữ liệu
              </h2>
              <p className="text-stone-500 font-medium">
                Hệ thống phát hiện database của bạn chưa được thiết lập cấu trúc
                bảng (schema).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 h-full">
                <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                  <Play className="size-5 text-stone-500" />
                  Hướng dẫn thực hiện:
                </h3>

                <ol className="list-decimal list-inside space-y-4 text-stone-600">
                  <li className="leading-relaxed">
                    Bấm nút{" "}
                    <strong className="text-indigo-600">Copy Mã SQL</strong> ở
                    bên dưới để sao chép toàn bộ cấu trúc cơ sở dữ liệu.
                  </li>
                  <li className="leading-relaxed">
                    Mở{" "}
                    <a
                      href="https://supabase.com/dashboard/project/_/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-600 font-semibold hover:underline"
                    >
                      Supabase SQL Editor
                    </a>{" "}
                    trong dự án của bạn.
                  </li>
                  <li className="leading-relaxed">
                    <strong>Dán (Paste)</strong> mã vừa copy vào khung soạn thảo
                    của Supabase.
                  </li>
                  <li className="leading-relaxed">
                    Bấm nút <strong>RUN</strong> (Chạy) ở góc phải dưới cùng màn
                    hình Supabase.
                  </li>
                  <li className="leading-relaxed">
                    Quay lại đây và <strong>Tải lại trang</strong> (hoặc bấm
                    Đăng nhập lại).
                  </li>
                </ol>

                <div className="mt-8">
                  <CopyButton content={schemaContent} />
                </div>

                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">SQL cũ tham khảo</p>
                  <p className="mt-1 leading-relaxed">
                    File <strong>caygiapha.sql</strong> là schema legacy kiểu
                    MySQL/MariaDB. Nó không dùng trực tiếp cho Supabase, nhưng
                    vẫn giữ phần cấu trúc quan hệ để bạn tham chiếu.
                  </p>
                </div>

                <div className="mt-4">
                  <CopyButton
                    content={legacySchemaContent}
                    label="Copy SQL cũ"
                    copiedLabel="Đã copy SQL cũ!"
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-semibold">SQL đồng bộ dữ liệu</p>
                  <p className="mt-1 leading-relaxed">
                    File <strong>docs/legacy-seed.sql</strong> sẽ nạp dữ liệu
                    từ bản legacy vào các bảng chính của app, nên sau khi chạy
                    xong danh sách thành viên sẽ không còn trống.
                  </p>
                </div>

                <div className="mt-4">
                  <CopyButton
                    content={legacySeedContent}
                    label="Copy SQL đồng bộ dữ liệu"
                    copiedLabel="Đã copy SQL đồng bộ!"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-1 border border-stone-200 rounded-2xl overflow-hidden bg-[#1e1e1e] flex flex-col h-[400px]">
              <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-stone-800">
                <span className="text-stone-400 text-xs font-mono">
                  docs/schema.sql
                </span>
              </div>
              <div className="p-4 overflow-y-auto w-full flex-grow custom-scrollbar">
                <pre className="text-xs sm:text-sm font-mono text-stone-300 leading-relaxed whitespace-pre">
                  <code>{schemaContent}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/login"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-stone-500 hover:text-stone-900 font-semibold text-sm transition-all duration-300 bg-white/60 px-5 py-2.5 rounded-full shadow-sm border border-stone-200 hover:border-stone-300 hover:shadow-md"
      >
        <ArrowLeft className="size-4" />
        Quay lại Đăng nhập
      </Link>

      <Footer className="bg-transparent border-none mt-auto relative z-10" />
    </div>
  );
}
