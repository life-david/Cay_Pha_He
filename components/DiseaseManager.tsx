"use client";

import { useEffect, useState } from "react";
import { useDiseaseContext } from "./DiseaseContext";

function genId() {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

export default function DiseaseManager() {
  const { diseases, addDisease, updateDisease, removeDisease } = useDiseaseContext();
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [maternal, setMaternal] = useState(true);
  const [maleFactor, setMaleFactor] = useState(0.5);
  const [femaleFactor, setFemaleFactor] = useState(1);
  const [color, setColor] = useState("#f97316");
  const [mechanism, setMechanism] = useState("autosomal_recessive");
  const [showMechanismInfo, setShowMechanismInfo] = useState(false);
  const [fatherGen, setFatherGen] = useState("AA");
  const [motherGen, setMotherGen] = useState("AA");

  useEffect(() => {
    if (editing) {
      setName(editing.name ?? "");
      setNotes(editing.notes ?? "");
      setCategory(editing.category ?? "");
      setColor(editing.color ?? "#f97316");
      setMechanism(editing.mechanism ?? "autosomal_recessive");
      setMaternal(!!editing.rules?.maternal);
      setMaleFactor(editing.rules?.maleFactor ?? 0.5);
      setFemaleFactor(editing.rules?.femaleFactor ?? 1);
    } else {
      setName("");
      setNotes("");
      setCategory("");
      setColor("#f97316");
      setMechanism("autosomal_recessive");
      setMaternal(true);
      setMaleFactor(0.5);
      setFemaleFactor(1);
    }
  }, [editing]);

  useEffect(() => {
    // For mitochondrial mechanism, ensure maternal is true
    if (mechanism === 'mitochondrial') setMaternal(true);
  }, [mechanism]);

  function allelesFromGen(g: string) {
    // g expected 'aa'|'Aa'|'AA' or X variants
    if (!g) return ['a','a'];
    if (g.length === 2) return [g[0], g[1]];
    if (g.length === 1) return [g[0], g[0]];
    return g.split('');
  }

  function computeAutosomalProb(fGen: string, mGen: string) {
    const f = allelesFromGen(fGen);
    const m = allelesFromGen(mGen);
    const counts: Record<string, number> = { AA: 0, Aa: 0, aa: 0 };
    for (const fa of f) for (const ma of m) {
      const g = (fa + ma).split('').sort().reverse().join('');
      // ensure order 'AA' or 'Aa' or 'aa' where 'a' is disease allele per convention
      let norm = g.replace(/a/g, 'a').replace(/A/g, 'A');
      if (norm === 'aA' || norm === 'Aa') norm = 'Aa';
      counts[norm] = (counts[norm] || 0) + 1;
    }
    return {
      AA: (counts.AA / 4) * 100,
      Aa: (counts.Aa / 4) * 100,
      aa: (counts.aa / 4) * 100,
    };
  }

  function computeDominantProb(fGen: string, mGen: string) {
    const p = computeAutosomalProb(fGen, mGen);
    return { affected: p.Aa + p.aa, healthy: p.AA, breakdown: p };
  }

  function computeMitoProb(_f: string, mGen: string) {
    // For mitochondrial we treat motherGen 'aa' as affected, else healthy
    const motherAffected = mGen === 'aa';
    return { affected: motherAffected ? 100 : 0, healthy: motherAffected ? 0 : 100 };
  }

  function computeXLinked(fGen: string, mGen: string) {
    // fGen: 'XA Y' or 'Xa Y' simplified as 'AY' or 'aY' notations; we will accept 'AY' (healthy) and 'aY' (affected)
    // but in UI we will use 'A' or 'a' for father's X (e.g., 'A' means X^A Y, 'a' means X^a Y)
    // mGen: 'AA','Aa','aa' representing XAXA, XAXa, XaXa
    // Sons: receive Y from father and one X from mother
    // Daughters: receive X from father and one X from mother
    const fatherHas = fGen === 'a';
    const m = allelesFromGen(mGen);
    // mother's alleles: m[0], m[1]
    const sonCounts: Record<string, number> = { affected: 0, healthy: 0 };
    const daughterCounts: Record<string, number> = { affected: 0, carrier: 0, healthy: 0 };
    // sons: get mother's allele only (father gives Y)
    for (const ma of m) {
      if (ma === 'a') sonCounts.affected += 1; else sonCounts.healthy += 1;
    }

    // daughters: father contributes his X (A or a) and mother contributes one
    for (const ma of m) {
      const alleles = (fGen === 'a' ? 'a' : 'A') + ma;
      const sorted = alleles.split('').sort().reverse().join('');
      if (sorted === 'aa') daughterCounts.affected += 1;
      else if (sorted === 'Aa' || sorted === 'aA') daughterCounts.carrier += 1;
      else daughterCounts.healthy += 1;
    }
    return {
      sons: { affected: (sonCounts.affected/2)*100, healthy: (sonCounts.healthy/2)*100 },
      daughters: { affected: (daughterCounts.affected/2)*100, carrier: (daughterCounts.carrier/2)*100, healthy: (daughterCounts.healthy/2)*100 }
    };
  }

  function getProbabilityPreview() {
    if (mechanism === 'autosomal_recessive') return computeAutosomalProb(fatherGen, motherGen);
    if (mechanism === 'autosomal_dominant') return computeDominantProb(fatherGen, motherGen);
    if (mechanism === 'mitochondrial') return computeMitoProb(fatherGen, motherGen);
    if (mechanism === 'x_linked') return computeXLinked(fatherGen, motherGen);
    return null;
  }
  function startCreate() {
    setEditing(null);
  }

  function startEdit(d: any) {
    setEditing(d);
  }

  function save() {
    if (!name.trim()) return;
    const payloadBase = { name: name.trim(), notes, category, color, mechanism, rules: { maternal, maleFactor, femaleFactor } };
    if (editing) {
      updateDisease({ ...editing, ...payloadBase });
    } else {
      const d = { id: genId(), ...payloadBase };
      addDisease(d);
    }
    setEditing(null);
  }

  function remove(id: string) {
    if (!confirm("Xác nhận xóa bệnh này?")) return;
    removeDisease(id);
  }

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Danh sách bệnh</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={startCreate}
            className="btn-sm bg-amber-50 border border-amber-200 text-amber-700"
          >
            Thêm bệnh mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {diseases.length === 0 ? (
          <div className="text-sm text-stone-500">Chưa có bệnh nào. Nhấn "Thêm bệnh mới" để bắt đầu.</div>
        ) : (
          diseases.map((d: any) => (
            <div key={d.id} className="p-3 border rounded-2xl flex items-start justify-between">
              <div>
                    <div className="font-semibold flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: d.color ?? '#f97316' }} />{d.name}</div>
                <div className="text-xs text-stone-500">{d.notes}</div>
                <div className="text-xs text-stone-400 mt-2">
                  Cơ chế: {d.mechanism ?? 'Tùy biến'}; Quy tắc: {d.rules.maternal ? "Truyền qua mẹ (mẫu)" : "Tùy biến"}; Nam nhân tử: {d.rules.maleFactor * 100}% ; Nữ nhân tử: {d.rules.femaleFactor * 100}%
                  {d.category ? <span className="ml-2 text-xs text-stone-500">Loại: {d.category}</span> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(d)} className="btn-sm">Sửa</button>
                <button onClick={() => remove(d.id)} className="btn-sm bg-red-50 text-red-600 border-red-100">Xóa</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-4 border rounded-2xl bg-stone-50">
        <h3 className="font-semibold mb-2">{editing ? "Sửa bệnh" : "Tạo bệnh mới"}</h3>
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên bệnh" className="w-full p-2 border rounded" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Loại (ví dụ: allergy)" className="w-full p-2 border rounded" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú" className="w-full p-2 border rounded" />
              <div className="flex items-center gap-2">
                <label className="text-sm">Màu ADN:</label>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-8 p-0 border rounded" />
                <div className="text-xs text-stone-500">{color}</div>
              </div>
          <div className="space-y-2">
            <label className="text-sm">Cơ chế di truyền</label>
            <select value={mechanism} onChange={(e) => setMechanism(e.target.value)} className="p-2 border rounded w-full">
              <option value="autosomal_recessive">Lặn trên NST thường (Autosomal recessive)</option>
              <option value="autosomal_dominant">Trội trên NST thường (Autosomal dominant)</option>
              <option value="mitochondrial">Di truyền qua ty thể (Mitochondrial - dòng mẹ)</option>
              <option value="x_linked">Liên kết giới tính X (X-linked)</option>
              <option value="custom">Tùy biến / Khác</option>
            </select>

            <div className="text-xs text-stone-500">
              {mechanism === 'autosomal_recessive' && (
                <div>
                  Hệ quy ước: Khỏe = AA, Mang gen ẩn = Aa, Mắc bệnh = aa. (Ví dụ: Tan máu bẩm sinh)
                </div>
              )}
              {mechanism === 'autosomal_dominant' && (
                <div>
                  Hệ quy ước: Khỏe = AA, Mắc bệnh = Aa hoặc aa. (Người bệnh thường là Aa trong quần thể)
                </div>
              )}
              {mechanism === 'mitochondrial' && (
                <div>
                  Nếu mẹ mắc (aa) → 100% con mắc; nếu mẹ khỏe (AA) → 0% con mắc.
                </div>
              )}
              {mechanism === 'x_linked' && (
                <div>
                  Liên kết X: cần phân biệt con trai / con gái theo bảng logic (ví dụ bố mắc → con gái mang / con trai khỏe...).
                </div>
              )}
              {mechanism === 'custom' && (
                <div>
                  Chọn "Tùy biến" để nhập tỷ lệ truyền (sử dụng các trường bên dưới).
                </div>
              )}
            </div>
            <div className="mt-3 p-3 border rounded bg-white">
              <div className="flex items-center justify-between">
                <div className="font-medium">Xem bảng xác suất (dự đoán cho con)</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowMechanismInfo(true)} className="btn-sm">Chi tiết</button>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {(mechanism === 'autosomal_recessive' || mechanism === 'autosomal_dominant' || mechanism === 'x_linked') && (
                  <div>
                    <label className="text-xs">Trạng thái BỐ</label>
                    {mechanism === 'x_linked' ? (
                      <select value={fatherGen} onChange={(e) => setFatherGen(e.target.value)} className="w-full p-2 border rounded">
                        <option value="A">X<sup>A</sup>Y (khỏe)</option>
                        <option value="a">X<sup>a</sup>Y (mắc)</option>
                      </select>
                    ) : (
                      <select value={fatherGen} onChange={(e) => setFatherGen(e.target.value)} className="w-full p-2 border rounded">
                        <option value="AA">Khỏe (AA)</option>
                        <option value="Aa">Mang gen ẩn (Aa)</option>
                        <option value="aa">Mắc bệnh (aa)</option>
                      </select>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-xs">Trạng thái MẸ</label>
                  {mechanism === 'mitochondrial' ? (
                    <select value={motherGen} onChange={(e) => setMotherGen(e.target.value)} className="w-full p-2 border rounded">
                      <option value="AA">Khỏe</option>
                      <option value="aa">Mắc (tất cả con mắc)</option>
                    </select>
                  ) : mechanism === 'x_linked' ? (
                    <select value={motherGen} onChange={(e) => setMotherGen(e.target.value)} className="w-full p-2 border rounded">
                      <option value="AA">X<sup>A</sup>X<sup>A</sup> (khỏe)</option>
                      <option value="Aa">X<sup>A</sup>X<sup>a</sup> (mang gen ẩn)</option>
                      <option value="aa">X<sup>a</sup>X<sup>a</sup> (mắc)</option>
                    </select>
                  ) : (
                    <select value={motherGen} onChange={(e) => setMotherGen(e.target.value)} className="w-full p-2 border rounded">
                      <option value="AA">Khỏe (AA)</option>
                      <option value="Aa">Mang gen ẩn (Aa)</option>
                      <option value="aa">Mắc bệnh (aa)</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-sm font-medium">Kết quả dự đoán</div>
                <div className="mt-2 p-3 bg-stone-50 rounded">
                  {(() => {
                    const p = getProbabilityPreview();
                    if (!p) return <div className="text-xs text-stone-500">Không có dữ liệu</div>;
                    if (mechanism === 'autosomal_recessive') {
                      return (
                        <table className="w-full text-xs">
                          <thead><tr><th>AA (khỏe)</th><th>Aa (mang)</th><th>aa (mắc)</th></tr></thead>
                          <tbody><tr><td>{p.AA.toFixed(0)}%</td><td>{p.Aa.toFixed(0)}%</td><td>{p.aa.toFixed(0)}%</td></tr></tbody>
                        </table>
                      );
                    }
                    if (mechanism === 'autosomal_dominant') {
                      return (
                        <table className="w-full text-xs">
                          <thead><tr><th>Ảnh hưởng</th><th>Khỏe</th></tr></thead>
                          <tbody><tr><td>{p.affected.toFixed(0)}%</td><td>{p.healthy.toFixed(0)}%</td></tr></tbody>
                        </table>
                      );
                    }
                    if (mechanism === 'mitochondrial') {
                      return (
                        <table className="w-full text-xs">
                          <thead><tr><th>Con mắc</th><th>Con khỏe</th></tr></thead>
                          <tbody><tr><td>{p.affected}%</td><td>{p.healthy}%</td></tr></tbody>
                        </table>
                      );
                    }
                    if (mechanism === 'x_linked') {
                      return (
                        <div>
                          <div className="text-xs font-medium">Con trai</div>
                          <table className="w-full text-xs mb-2"><tbody><tr><td>Mắc</td><td>{p.sons.affected.toFixed(0)}%</td><td>Khỏe</td><td>{p.sons.healthy.toFixed(0)}%</td></tr></tbody></table>
                          <div className="text-xs font-medium">Con gái</div>
                          <table className="w-full text-xs"><tbody><tr><td>Mắc</td><td>{p.daughters.affected.toFixed(0)}%</td><td>Mang gen ẩn</td><td>{p.daughters.carrier.toFixed(0)}%</td><td>Khỏe</td><td>{p.daughters.healthy.toFixed(0)}%</td></tr></tbody></table>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">Tỷ lệ truyền từ nam (số từ 0-1)</label>
            <input type="number" step="0.01" min="0" max="1" value={maleFactor} onChange={(e) => setMaleFactor(Number(e.target.value))} className="p-2 border rounded" />
            <label className="text-sm">Tỷ lệ truyền từ nữ</label>
            <input type="number" step="0.01" min="0" max="1" value={femaleFactor} onChange={(e) => setFemaleFactor(Number(e.target.value))} className="p-2 border rounded" />
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="btn-primary">Lưu</button>
            <button onClick={() => { setEditing(null); setName(""); setNotes(""); }} className="btn-secondary">Hủy</button>
          </div>
        </div>
      </div>
    </div>
    {showMechanismInfo && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowMechanismInfo(false)} />
        <div className="relative z-60 w-full max-w-2xl p-6 bg-white rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Chi tiết cơ chế di truyền</h3>
            <button className="btn-sm" onClick={() => setShowMechanismInfo(false)}>Đóng</button>
          </div>
          <div className="space-y-4 text-sm text-stone-700">
            <div>
              <h4 className="font-medium">1. Lặn trên NST thường</h4>
              <div className="text-xs mt-1">Khỏe = AA, Mang gen ẩn = Aa, Mắc bệnh = aa.</div>
              <table className="w-full text-xs mt-2 border-collapse"><thead><tr className="text-left"><th>Bố</th><th>Mẹ</th><th>Con mắc</th><th>Con mang</th><th>Con khỏe</th></tr></thead>
                <tbody>
                  <tr><td>AA</td><td>AA</td><td>0%</td><td>0%</td><td>100%</td></tr>
                  <tr><td>AA</td><td>Aa</td><td>0%</td><td>50%</td><td>50%</td></tr>
                  <tr><td>Aa</td><td>Aa</td><td>25%</td><td>50%</td><td>25%</td></tr>
                  <tr><td>Aa</td><td>aa</td><td>50%</td><td>50%</td><td>0%</td></tr>
                  <tr><td>aa</td><td>aa</td><td>100%</td><td>0%</td><td>0%</td></tr>
                </tbody></table>
            </div>

            <div>
              <h4 className="font-medium">2. Trội trên NST thường</h4>
              <div className="text-xs mt-1">Khỏe = AA, Mắc bệnh = Aa hoặc aa.</div>
              <table className="w-full text-xs mt-2"><thead><tr className="text-left"><th>Bố</th><th>Mẹ</th><th>Con mắc</th><th>Con khỏe</th></tr></thead>
                <tbody>
                  <tr><td>AA</td><td>AA</td><td>0%</td><td>100%</td></tr>
                  <tr><td>Aa</td><td>AA</td><td>50%</td><td>50%</td></tr>
                  <tr><td>Aa</td><td>Aa</td><td>75%</td><td>25%</td></tr>
                </tbody></table>
            </div>

            <div>
              <h4 className="font-medium">3. Di truyền qua ty thể (dòng mẹ)</h4>
              <div className="text-xs mt-1">Nếu mẹ mắc → 100% con mắc; nếu mẹ khỏe → 0% con mắc.</div>
            </div>

            <div>
              <h4 className="font-medium">4. Liên kết giới tính X</h4>
              <div className="text-xs mt-1">Xem xét riêng con trai và con gái theo bảng:</div>
              <table className="w-full text-xs mt-2"><thead><tr className="text-left"><th>Bố</th><th>Mẹ</th><th>Con trai</th><th>Con gái</th></tr></thead>
                <tbody>
                  <tr><td>XaY</td><td>XAXA</td><td>100% khỏe</td><td>100% mang</td></tr>
                  <tr><td>XAY</td><td>XAXa</td><td>50% mắc / 50% khỏe</td><td>50% mang / 50% khỏe</td></tr>
                </tbody></table>
            </div>
          </div>
        </div>
      </div>
    )}
      </>
  );
}
