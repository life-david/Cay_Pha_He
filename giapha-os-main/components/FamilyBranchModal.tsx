"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { X } from "lucide-react";

export default function FamilyBranchModal({
  open,
  personId,
  onClose,
}: {
  open: boolean;
  personId: string | null;
  onClose: () => void;
}) {
  const [ancestors, setAncestors] = useState<Record<number, any[]>>({});
  const [spouses, setSpouses] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [rootPerson, setRootPerson] = useState<any | null>(null);

  useEffect(() => {
    if (!open || !personId) return;
    const supabase = createClient();

    let mounted = true;

    const load = async () => {
      // fetch relationships and persons as needed
      const { data: rels } = await supabase
        .from("relationships")
        .select("*")
        .in("type", ["biological_child", "adopted_child", "marriage"]);

      const { data: persons } = await supabase.from("persons").select("*");

      if (!mounted) return;

      const personsMap = new Map((persons ?? []).map((p: any) => [p.id, p]));

      setRootPerson(personsMap.get(personId) ?? null);

      // Build parent map: child -> [parents]
      const parentMap = new Map<string, string[]>();
      const spouseMap = new Map<string, string[]>();

      (rels ?? []).forEach((r: any) => {
        if (r.type === "biological_child" || r.type === "adopted_child") {
          const arr = parentMap.get(r.person_b) ?? [];
          arr.push(r.person_a);
          parentMap.set(r.person_b, arr);
        } else if (r.type === "marriage") {
          const a = spouseMap.get(r.person_a) ?? [];
          a.push(r.person_b);
          spouseMap.set(r.person_a, a);
          const b = spouseMap.get(r.person_b) ?? [];
          b.push(r.person_a);
          spouseMap.set(r.person_b, b);
        }
      });

      // Ancestors by depth
      const depths: Record<number, any[]> = {};
      const visited = new Set<string>();
      let current: string[] = [personId];
      for (let depth = 1; depth <= 10; depth++) {
        const next: string[] = [];
        const nodes: any[] = [];
        for (const c of current) {
          const parents = parentMap.get(c) ?? [];
          for (const p of parents) {
            if (!visited.has(p)) {
              visited.add(p);
              nodes.push(personsMap.get(p));
              next.push(p);
            }
          }
        }
        if (nodes.length === 0) break;
        depths[depth] = nodes;
        current = next;
      }

      setAncestors(depths);

      // spouses & direct children
      const spouseIds = spouseMap.get(personId) ?? [];
      setSpouses(spouseIds.map((id) => personsMap.get(id)).filter(Boolean));

      // children: relationships where person_a == personId
      const childIds = (rels ?? [])
        .filter((r: any) => (r.type === "biological_child" || r.type === "adopted_child") && r.person_a === personId)
        .map((r: any) => r.person_b);
      setChildren(childIds.map((id: string) => personsMap.get(id)).filter(Boolean));
    };

    load();

    return () => {
      mounted = false;
    };
  }, [open, personId]);

  if (!open || !personId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg max-w-4xl w-full p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Nhánh gia đình: {rootPerson?.full_name}</h3>
          <button onClick={onClose} className="p-2 rounded-md text-stone-600 hover:bg-stone-100">
            <X />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-bold text-stone-700 mb-2">Tổ tiên</h4>
            <div className="space-y-2">
              {Object.keys(ancestors).length === 0 && <p className="text-sm text-stone-500">Không có dữ liệu tổ tiên.</p>}
              {Object.entries(ancestors).map(([depth, arr]) => (
                <div key={depth} className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                  <div className="text-xs font-medium text-stone-500 mb-1">Cách {depth} đời</div>
                  <ul className="text-sm text-stone-700 space-y-1">
                    {arr.map((p: any) => (
                      <li key={p.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center text-sm text-stone-500">
                          {/* avatar small */}
                          {p.avatar_url ? (
                            <img src={p.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-xs">{p.full_name?.charAt(0) ?? "?"}</div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{p.full_name}</div>
                          <div className="text-xs text-stone-400">{p.generation ? `Đời ${p.generation}` : "—"}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-stone-700 mb-2">Vợ / Chồng & Con</h4>
            <div className="space-y-3">
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                <div className="text-xs font-medium text-stone-500 mb-1">Vợ / Chồng</div>
                {spouses.length === 0 && <p className="text-sm text-stone-500">Không có</p>}
                <ul className="space-y-2">
                  {spouses.map((s) => (
                    <li key={s.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center text-sm text-stone-500">
                        {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" /> : <div className="text-xs">{s.full_name?.charAt(0) ?? "?"}</div>}
                      </div>
                      <div>
                        <div className="font-medium">{s.full_name}</div>
                        <div className="text-xs text-stone-400">{s.generation ? `Đời ${s.generation}` : "—"}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                <div className="text-xs font-medium text-stone-500 mb-1">Con</div>
                {children.length === 0 && <p className="text-sm text-stone-500">Không có</p>}
                <ul className="space-y-2">
                  {children.map((c) => (
                    <li key={c.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center text-sm text-stone-500">
                        {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : <div className="text-xs">{c.full_name?.charAt(0) ?? "?"}</div>}
                      </div>
                      <div>
                        <div className="font-medium">{c.full_name}</div>
                        <div className="text-xs text-stone-400">{c.generation ? `Đời ${c.generation}` : "—"}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
