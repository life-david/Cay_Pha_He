"use client";

import { useDashboard } from "@/components/DashboardContext";
import DashboardMemberList from "@/components/DashboardMemberList";
import RootSelector from "@/components/RootSelector";
import { Person, Relationship } from "@/types";
import { useMemo } from "react";
import dynamic from "next/dynamic";

const FamilyTree = dynamic(() => import("@/components/FamilyTree"));
const MindmapTree = dynamic(() => import("@/components/MindmapTree"));
const BubbleMapTree = dynamic(
  () =>
    import("@/components/BubbleMapTree").catch((err) => {
      console.error("Failed to load BubbleMapTree:", err);
      return {
        default: () => (
          <div className="flex absolute inset-0 items-center justify-center p-4 text-center bg-stone-50 rounded-2xl border border-stone-200/60 shadow-inner text-stone-500">
            Tính năng này không được hỗ trợ trên trình duyệt của bạn. Vui lòng cập nhật hoặc sử dụng trình duyệt khác.
          </div>
        ),
      };
    }),
  { ssr: false },
);

interface DashboardViewsProps {
  persons: Person[];
  relationships: Relationship[];
  canEdit?: boolean;
}

export default function DashboardViews({
  persons,
  relationships,
  canEdit = false,
}: DashboardViewsProps) {
  const { view: currentView, rootId } = useDashboard();

  // Prepare map and roots for tree views
  const { personsMap, roots, defaultRootId } = useMemo(() => {
    const pMap = new Map<string, Person>();
    persons.forEach((p) => pMap.set(p.id, p));

    const childIds = new Set(
      relationships
        .filter(
          (r) => r.type === "biological_child" || r.type === "adopted_child",
        )
        .map((r) => r.person_b),
    );

    let finalRootId = rootId;

    // If no rootId is provided, fallback to generation 1 or earliest birth year
    if (!finalRootId || !pMap.has(finalRootId)) {
      const rootsFallback = persons.filter((p) => !childIds.has(p.id));
      if (rootsFallback.length > 0) {
        const gen1 = rootsFallback.filter((p) => p.generation === 1);
        const sortByBirthYear = (a: Person, b: Person) => {
          const ya = a.birth_year ?? Infinity;
          const yb = b.birth_year ?? Infinity;
          return ya - yb;
        };

        if (gen1.length > 0) {
          finalRootId = gen1.sort(sortByBirthYear)[0].id;
        } else {
          finalRootId = rootsFallback.sort(sortByBirthYear)[0].id;
        }
      } else if (persons.length > 0) {
        finalRootId = persons[0].id; // ultimate fallback
      }
    }

    // If a specific rootId was provided, try to find its topmost ancestor
    // so the tree will display the ancestor chain leading to the selected root.
    let calculatedRoots: Person[] = [];
    if (finalRootId && pMap.has(finalRootId)) {
      // build child->parents map
      const parentMap = new Map<string, string[]>();
      relationships.forEach((r) => {
        if (r.type !== "biological_child" && r.type !== "adopted_child") return;
        // r.person_a is parent, r.person_b is child
        if (!parentMap.has(r.person_b)) parentMap.set(r.person_b, []);
        parentMap.get(r.person_b)!.push(r.person_a);
      });

      const chooseBestParent = (parents: string[]) => {
        // Prefer parent with smallest generation number, then earliest birth year
        return parents.reduce((best, id) => {
          if (!best) return id;
          const a = pMap.get(best)!;
          const b = pMap.get(id)!;
          const ga = a.generation ?? Infinity;
          const gb = b.generation ?? Infinity;
          if (ga !== gb) return ga < gb ? best : id;
          const ya = a.birth_year ?? Infinity;
          const yb = b.birth_year ?? Infinity;
          return ya <= yb ? best : id;
        }, parents[0] as string);
      };

      let topId = finalRootId;
      // climb up while there is a parent available
      while (true) {
        const parents = parentMap.get(topId) ?? [];
        if (parents.length === 0) break;
        const next = chooseBestParent(parents);
        if (!pMap.has(next)) break;
        // stop if next is same as current to avoid infinite loop
        if (next === topId) break;
        topId = next;
      }

      calculatedRoots = [pMap.get(topId)!];
    }

    return {
      personsMap: pMap,
      roots: calculatedRoots,
      defaultRootId: finalRootId,
    };
  }, [persons, relationships, rootId]);

  const activeRootId = rootId || defaultRootId;

  return (
    <>
      <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col">
        {currentView !== "list" && persons.length > 0 && activeRootId && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 w-full flex flex-col sm:flex-row flex-wrap items-center sm:justify-between gap-4 relative z-20">
            <RootSelector persons={persons} currentRootId={activeRootId} />
            <div
              id="tree-toolbar-portal"
              className="flex items-center gap-2 flex-wrap justify-center"
            />
          </div>
        )}

        {currentView === "list" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10">
            <DashboardMemberList
              initialPersons={persons}
              relationships={relationships}
              canEdit={canEdit}
            />
          </div>
        )}

        <div className="flex-1 w-full relative z-10">
          {currentView === "tree" && (
            <FamilyTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              visibleOnly={
                rootId
                  ? (() => {
                      // compute ancestors and descendants of the selected rootId
                      const parentsMap = new Map<string, string[]>();
                      const childrenMap = new Map<string, string[]>();
                      relationships.forEach((r) => {
                        if (r.type === "biological_child" || r.type === "adopted_child") {
                          // r.person_a is parent, r.person_b is child
                          if (!parentsMap.has(r.person_b)) parentsMap.set(r.person_b, []);
                          parentsMap.get(r.person_b)!.push(r.person_a);
                          if (!childrenMap.has(r.person_a)) childrenMap.set(r.person_a, []);
                          childrenMap.get(r.person_a)!.push(r.person_b);
                        }
                      });

                      const visible = new Set<string>();

                      // ancestors: climb up
                      let cur: string | null = rootId;
                      while (cur) {
                        visible.add(cur);
                        const parents: string[] = parentsMap.get(cur) ?? [];
                        if (parents.length === 0) break;
                        // choose first parent (or prefer by generation/birth if available)
                        cur = parents[0];
                      }

                      // descendants: DFS
                      const stack = [rootId];
                      while (stack.length > 0) {
                        const node = stack.pop()!;
                        visible.add(node);
                        const childs: string[] = childrenMap.get(node) ?? [];
                        for (const c of childs) {
                          if (!visible.has(c)) stack.push(c);
                        }
                      }

                      return visible;
                    })()
                  : null
              }
              canEdit={canEdit}
            />
          )}
          {currentView === "mindmap" && (
            <MindmapTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              canEdit={canEdit}
            />
          )}
          {currentView === "bubble" && (
            <BubbleMapTree
              personsMap={personsMap}
              relationships={relationships}
              roots={roots}
              canEdit={canEdit}
            />
          )}
        </div>
      </main>
    </>
  );
}
