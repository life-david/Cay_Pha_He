"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePanZoom } from "@/hooks/usePanZoom";
import { Person, Relationship } from "@/types";
import { Minus, Plus } from "lucide-react";
import { useDashboard } from "./DashboardContext";
import FamilyNodeCard from "./FamilyNodeCard";
import { computeBloodKinship } from "@/utils/kinshipHelpers";
import DiseasePickerModal from "./DiseasePickerModal";
import { useDiseaseContext } from "./DiseaseContext";
import TreeToolbar from "./TreeToolbar";

import { buildAdjacencyLists, getFilteredTreeData } from "@/utils/treeHelpers";

const DEFAULT_AUTO_COLLAPSE_LEVEL = 2;

type GenotypeProbabilities = {
  AA: number;
  Aa: number;
  aa: number;
};

function genotypeToAlleles(genotype: string | null | undefined) {
  if (genotype === "AA") return { A: 1, a: 0 };
  if (genotype === "Aa" || genotype === "aA") return { A: 0.5, a: 0.5 };
  return { A: 0, a: 1 };
}

function combineParentGenotypes(
  parentOne: string | null | undefined,
  parentTwo: string | null | undefined,
): GenotypeProbabilities {
  const a = genotypeToAlleles(parentOne ?? null);
  const b = genotypeToAlleles(parentTwo ?? null);

  return {
    AA: a.A * b.A,
    Aa: a.A * b.a + a.a * b.A,
    aa: a.a * b.a,
  };
}

export default function FamilyTree({
  personsMap,
  relationships,
  roots,
  visibleOnly = null,
  canEdit,
}: {
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  roots: Person[];
  visibleOnly?: Set<string> | null;
  canEdit?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hideDaughtersInLaw, setHideDaughtersInLaw] = useState(false);
  const [hideSonsInLaw, setHideSonsInLaw] = useState(false);
  const [hideDaughters, setHideDaughters] = useState(false);
  const [hideSons, setHideSons] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);
  const [maternalMode, setMaternalMode] = useState(false);
  const [maternalOriginId, setMaternalOriginId] = useState<string | null>(null);
  const [activeDiseaseId, setActiveDiseaseId] = useState<string | null>(null);
  const { setMemberModalId } = useDashboard();
  // map personId -> probability (0..1)
  const [maternalProbMap, setMaternalProbMap] = useState<Map<string, number>>(new Map());

  // Tập hợp các personId đang bị đóng (collapsed)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [hideExpandButtons, setHideExpandButtons] = useState(false);
  const [autoCollapseLevel, setAutoCollapseLevel] = useState(
    DEFAULT_AUTO_COLLAPSE_LEVEL,
  );

  const { showAvatar } = useDashboard();
  const [pickerPersonId, setPickerPersonId] = useState<string | null>(null);
  const { assignDiseaseToPerson, getAssignedDisease, getGenotypeForPerson, getPersonGenotype } = useDiseaseContext();
  const { diseases } = useDiseaseContext();

  const {
    scale,
    isPressed,
    isDragging,
    handlers: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUpOrLeave,
      handleClickCapture,
      handleZoomIn,
      handleZoomOut,
      handleResetZoom,
    },
  } = usePanZoom(containerRef);

  // Center the scroll area horizontally
  const centerTree = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const inner = el.querySelector("#export-container");
    if (inner) {
      const innerRect = inner.getBoundingClientRect();
      const containerRect = el.getBoundingClientRect();
      el.scrollLeft +=
        innerRect.left +
        innerRect.width / 2 -
        (containerRect.left + containerRect.width / 2);
    } else {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }
  }, []);

  useEffect(() => {
    const equalizeHeights = () => {
      if (!containerRef.current) return;
      const nodes = containerRef.current.querySelectorAll(".node-container");
      const levelMap: Record<string, HTMLElement[]> = {};

      nodes.forEach((node) => {
        const level = node.getAttribute("data-level");
        if (level != null) {
          if (!levelMap[level]) levelMap[level] = [];
          levelMap[level].push(node as HTMLElement);
        }
      });

      Object.values(levelMap).forEach((levelNodes) => {
        // Reset min-height first to get natural height
        levelNodes.forEach((node) => {
          const innerFlex = node.firstElementChild as HTMLElement;
          if (innerFlex) innerFlex.style.minHeight = "0px";
        });

        let maxHeight = 0;
        // Find the maximum height in this level
        levelNodes.forEach((node) => {
          const innerFlex = node.firstElementChild as HTMLElement;
          if (innerFlex) {
            maxHeight = Math.max(maxHeight, innerFlex.offsetHeight);
          }
        });

        // Apply max height to all nodes in this level
        levelNodes.forEach((node) => {
          const innerFlex = node.firstElementChild as HTMLElement;
          if (innerFlex && maxHeight > 0) {
            innerFlex.style.minHeight = `${maxHeight}px`;
          }
        });
      });
    };

    const timeoutId = setTimeout(equalizeHeights, 50);
    window.addEventListener("resize", equalizeHeights);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", equalizeHeights);
    };
  }, [
    roots,
    personsMap,
    relationships,
    showAvatar,
    scale,
    hideDaughtersInLaw,
    hideSonsInLaw,
    hideDaughters,
    hideSons,
    hideMales,
    hideFemales,
    collapsedNodes,
  ]);

  const adj = useMemo(
    () => buildAdjacencyLists(relationships, personsMap),
    [relationships, personsMap],
  );

  const getCurrentGenotype = useCallback(
    (personId: string) => {
      if (activeDiseaseId) {
        return getGenotypeForPerson(activeDiseaseId, personId) ?? getPersonGenotype(personId);
      }
      return getPersonGenotype(personId);
    },
    [activeDiseaseId, getGenotypeForPerson, getPersonGenotype],
  );

  const parentMap = useMemo(() => {
    const map = new Map<string, string[]>();
    relationships.forEach((relationship) => {
      if (relationship.type !== "biological_child") return;
      if (!map.has(relationship.person_b)) map.set(relationship.person_b, []);
      map.get(relationship.person_b)!.push(relationship.person_a);
    });
    return map;
  }, [relationships]);

  const genotypeProbabilityMap = useMemo(() => {
    const cache = new Map<string, GenotypeProbabilities>();

    const compute = (personId: string): GenotypeProbabilities => {
      const cached = cache.get(personId);
      if (cached) return cached;

      const parentIds = Array.from(new Set(parentMap.get(personId) ?? [])).slice(0, 2);
      if (parentIds.length === 0) {
        const fallback: GenotypeProbabilities = { AA: 0, Aa: 0, aa: 1 };
        cache.set(personId, fallback);
        return fallback;
      }

      const parentOne = getCurrentGenotype(parentIds[0]);
      const parentTwo = getCurrentGenotype(parentIds[1] ?? null);
      const result = combineParentGenotypes(parentOne, parentTwo);
      cache.set(personId, result);
      return result;
    };

    personsMap.forEach((_person, personId) => {
      compute(personId);
    });

    return cache;
  }, [getCurrentGenotype, parentMap, personsMap]);

  // Defensive: observe DOM inside the tree and hide small lone '0' labels that appear inside .node-container
  // to avoid noisy zeros. We scope to elements with small text classes to reduce false positives.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const removeZeroTextNodesIn = (node: Node) => {
      node.childNodes.forEach((cn) => {
        if (cn.nodeType === Node.TEXT_NODE) {
          try {
            if (cn.nodeValue && cn.nodeValue.trim() === "0") {
              // only remove if inside a node-container
              if ((cn.parentElement && cn.parentElement.closest('.node-container'))) {
                cn.nodeValue = '';
              }
            }
          } catch (e) {}
        }
      });
    };

    // initial pass: remove any direct text nodes equal to '0' inside node containers
    root.querySelectorAll('.node-container').forEach((nc) => removeZeroTextNodesIn(nc));

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => {
            if (n instanceof Element) {
              // clean any newly added subtree
              n.querySelectorAll('.node-container').forEach((nc) => removeZeroTextNodesIn(nc));
              // also check the element itself
              removeZeroTextNodesIn(n);
            } else if (n.nodeType === Node.TEXT_NODE) {
              // direct text node added
              if (n.nodeValue && n.nodeValue.trim() === '0') {
                const p = (n.parentElement);
                if (p && p.closest('.node-container')) n.nodeValue = '';
              }
            }
          });
        } else if (m.type === 'characterData') {
          const target = m.target as Node;
          if (target.nodeType === Node.TEXT_NODE) {
            if (target.nodeValue && target.nodeValue.trim() === '0') {
              const p = target.parentElement;
              if (p && p.closest('.node-container')) target.nodeValue = '';
            }
          }
        }
      }
    });

    mo.observe(root, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, [containerRef, maternalProbMap, collapsedNodes, activeDiseaseId]);

  // compute maternal-line affected set when origin or relationships change
  useEffect(() => {
    const probMap = new Map<string, number>();
    if (!maternalOriginId) {
      setMaternalProbMap(probMap);
      return;
    }

    const origin = personsMap.get(maternalOriginId);
    if (!origin) {
      setMaternalProbMap(probMap);
      return;
    }
    // determine disease rules: prefer an explicitly selected active disease type, otherwise use origin's assigned disease
    let disease: any = null;
    if (activeDiseaseId) {
      disease = diseases.find((d: any) => d.id === activeDiseaseId) ?? null;
    }
    if (!disease) {
      disease = getAssignedDisease(maternalOriginId);
    }

    // BFS queue holds { id, nodeProb }
    const q: { id: string; nodeProb: number }[] = [];

    // initial node probability
    if (disease) {
      // if disease is maternal-only and origin is male, he may not be affected but can transmit
      const originProb = disease.rules.maternal && origin.gender === "male" ? 0 : 1;
      probMap.set(maternalOriginId, originProb);
      q.push({ id: maternalOriginId, nodeProb: originProb });
    } else {
      // fallback default behaviour (previous hard-coded rules)
      if (origin.gender === "female") {
        probMap.set(maternalOriginId, 1);
        q.push({ id: maternalOriginId, nodeProb: 1 });
      } else {
        probMap.set(maternalOriginId, 0);
        q.push({ id: maternalOriginId, nodeProb: 0.5 });
      }
    }

    while (q.length > 0) {
      const { id: pid, nodeProb } = q.shift()!;
      const children = adj.childrenByPersonId.get(pid) ?? [];

      // determine transmit factor for this node
      const node = personsMap.get(pid);
      let transmitFactor = 1;
      if (disease && node) {
        transmitFactor = node.gender === "female" ? disease.rules.femaleFactor : disease.rules.maleFactor;
      } else {
        transmitFactor = 1;
      }

      const parentProbForChildren = nodeProb * transmitFactor;

      for (const child of children) {
        // child gender reduces probability for males
        const childProb = child.gender === "male" ? parentProbForChildren * 0.5 : parentProbForChildren;
        const existing = probMap.get(child.id) ?? 0;
        if (childProb > existing) {
          probMap.set(child.id, childProb);
        }

        if (childProb > 0) {
          q.push({ id: child.id, nodeProb: childProb });
        }
      }
    }

    setMaternalProbMap(probMap);
  }, [maternalOriginId, adj, personsMap, diseases, activeDiseaseId]);

  const getTreeData = (personId: string) =>
    getFilteredTreeData(personId, personsMap, adj, {
      hideDaughtersInLaw,
      hideSonsInLaw,
      hideDaughters,
      hideSons,
      hideMales,
      hideFemales,
    });

  // Tự động đóng các nhánh từ đời autoCollapseLevel trở đi + căn giữa sau khi layout ổn định
  useEffect(() => {
    const autoCollapsed = new Set<string>();

    const walk = (personId: string, visited: Set<string>, level: number) => {
      if (visited.has(personId)) return;
      visited.add(personId);

      const data = getTreeData(personId);
      if (!data.person) return;

      if (
        autoCollapseLevel > 0 &&
        level >= autoCollapseLevel &&
        data.children.length > 0
      ) {
        autoCollapsed.add(personId);
      }

      data.children.forEach((child) =>
        walk(child.id, new Set(visited), level + 1),
      );
    };

    roots.forEach((root) => walk(root.id, new Set(), 0));
    setCollapsedNodes(autoCollapsed);

    // Double rAF: wait for React to re-render with collapsed state, then center
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(centerTree);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, personsMap, relationships, autoCollapseLevel]);

  const toggleCollapse = useCallback((personId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }, []);

  const handleCenter = centerTree;

  // Recursive function for rendering nodes
  // Tracks visited IDs to prevent infinite loops from circular relationships
  const renderTreeNode = (
    personId: string,
    visited: Set<string> = new Set(),
    level: number = 0,
  ): React.ReactNode => {
    // If a visibleOnly set is provided, prune nodes not in the set
    if (visibleOnly && !visibleOnly.has(personId)) return null;
    if (visited.has(personId)) return null; // cycle guard
    visited.add(personId);

    const data = getTreeData(personId);
    if (!data.person) return null;

    const hasChildren = data.children.length > 0;
    const isCollapsed = collapsedNodes.has(personId);

    const onCardClick = () => {
      if (maternalMode) {
        // toggle origin
        setMaternalOriginId((prev) => (prev === personId ? null : personId));
      }
    };

    const onDiseaseClick = (e: React.MouseEvent) => {
      // open picker for this person — default to showing allergy-type diseases
      setPickerPersonId(personId);
    };

    const prob = maternalProbMap.get(personId) ?? 0;
    const isOrigin = maternalOriginId === personId;

    return (
      <li>
        <div
          className="node-container inline-flex flex-col items-center"
          data-level={level}
        >
          {/* Main Person & Spouses Row */}
          <div
            className={`flex relative z-10 items-stretch h-full${showAvatar ? " bg-white rounded-2xl shadow-md border border-stone-200/80 transition-opacity" : ""}`}
          >
            {(() => {
              // compute if main person has any close-kin spouse
              let mainIsCloseKin = false;
              try {
                const personsArray = Array.from(personsMap.values()).map((p) => ({
                  id: p.id,
                  full_name: p.full_name,
                  gender: p.gender,
                  birth_year: p.birth_year ?? null,
                  birth_order: p.birth_order ?? null,
                  generation: p.generation ?? null,
                  is_in_law: p.is_in_law ?? false,
                }));

                for (const spouseData of data.spouses) {
                  const kin = computeBloodKinship(
                    {
                      id: data.person.id,
                      full_name: data.person.full_name,
                      gender: data.person.gender,
                      birth_year: data.person.birth_year ?? null,
                      birth_order: data.person.birth_order ?? null,
                      generation: data.person.generation ?? null,
                      is_in_law: data.person.is_in_law ?? false,
                    } as any,
                    {
                      id: spouseData.person.id,
                      full_name: spouseData.person.full_name,
                      gender: spouseData.person.gender,
                      birth_year: spouseData.person.birth_year ?? null,
                      birth_order: spouseData.person.birth_order ?? null,
                      generation: spouseData.person.generation ?? null,
                      is_in_law: spouseData.person.is_in_law ?? false,
                    } as any,
                    personsArray as any,
                    relationships as any,
                  );
                  if (kin && kin.distance >= 0 && kin.distance <= 4) {
                    mainIsCloseKin = true;
                    break;
                  }
                }
              } catch (err) {
                // ignore
              }

              return (
                <FamilyNodeCard
                  person={data.person}
                  level={level}
                  onClickCard={onCardClick}
                  onClickName={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setMemberModalId(data.person.id);
                  }}
                  diseaseProb={prob}
                  isDiseaseOrigin={isOrigin}
                  onDiseaseClick={onDiseaseClick}
                  showGenotypeControls={maternalMode}
                  activeDiseaseId={activeDiseaseId}
                  genotypeProbabilities={genotypeProbabilityMap.get(data.person.id) ?? null}
                  showGenotypeProbabilities={(parentMap.get(data.person.id)?.length ?? 0) > 0}
                  childrenCount={data.children.length}
                  childrenNames={data.children.map((c) => c.full_name)}
                  isKinWarning={mainIsCloseKin}
                  hasSpouse={data.spouses.length > 0}
                />
              );
            })()}

            {data.spouses.length > 0 &&
              data.spouses.map((spouseData, idx) => {
                const spId = spouseData.person.id;
                const spProb = maternalProbMap.get(spId) ?? 0;

                let isCloseKin = false;
                try {
                  const personsArray = Array.from(personsMap.values()).map((p) => ({
                    id: p.id,
                    full_name: p.full_name,
                    gender: p.gender,
                    birth_year: p.birth_year ?? null,
                    birth_order: p.birth_order ?? null,
                    generation: p.generation ?? null,
                    is_in_law: p.is_in_law ?? false,
                  }));

                  const kin = computeBloodKinship(
                    {
                      id: data.person.id,
                      full_name: data.person.full_name,
                      gender: data.person.gender,
                      birth_year: data.person.birth_year ?? null,
                      birth_order: data.person.birth_order ?? null,
                      generation: data.person.generation ?? null,
                      is_in_law: data.person.is_in_law ?? false,
                    } as any,
                    {
                      id: spouseData.person.id,
                      full_name: spouseData.person.full_name,
                      gender: spouseData.person.gender,
                      birth_year: spouseData.person.birth_year ?? null,
                      birth_order: spouseData.person.birth_order ?? null,
                      generation: spouseData.person.generation ?? null,
                      is_in_law: spouseData.person.is_in_law ?? false,
                    } as any,
                    personsArray as any,
                    relationships as any,
                  );

                  if (kin && kin.distance >= 0 && kin.distance <= 4) isCloseKin = true;
                } catch (err) {
                  // ignore
                }

                return (
                  <div key={spId} className="flex relative">
                    <FamilyNodeCard
                      isRingVisible={idx === 0}
                      isPlusVisible={idx > 0}
                      person={spouseData.person}
                      role={spouseData.person.gender === "male" ? "Chồng" : "Vợ"}
                      note={spouseData.note}
                      level={level}
                      diseaseProb={spProb}
                      onDiseaseClick={(e) => { e.stopPropagation(); setPickerPersonId(spId); }}
                      onClickName={(e) => { e.stopPropagation(); e.preventDefault(); setMemberModalId(spId); }}
                      showGenotypeControls={!!activeDiseaseId}
                      activeDiseaseId={activeDiseaseId}
                      childrenCount={(adj.childrenByPersonId.get(spId) || []).length}
                      childrenNames={(adj.childrenByPersonId.get(spId) || []).map((c) => c.full_name)}
                      isKinWarning={isCloseKin}
                      hasSpouse={((adj.spousesByPersonId.get(spId) || []).length ?? 0) > 0}
                    />
                  </div>
                );
              })}

            {/* Expand/Collapse Toggle – centered on the row */}
            {!hideExpandButtons && hasChildren && (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  toggleCollapse(personId);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleCollapse(personId);
                  }
                }}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white border border-stone-200/80 rounded-full size-6 flex items-center justify-center shadow-md z-100 text-stone-500 hover:text-amber-600 hover:border-amber-300 transition-colors cursor-pointer"
                title={isCollapsed ? "Mở rộng" : "Thu gọn"}
              >
                {isCollapsed ? (
                  <Plus className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Render Children (if any and not collapsed) */}
        {hasChildren && !isCollapsed && (
          <ul>
            {data.children.map((child) => (
              <React.Fragment key={child.id}>
                {renderTreeNode(child.id, new Set(visited), level + 1)}
              </React.Fragment>
            ))}
          </ul>
        )}
      </li>
    );
  };

  if (roots.length === 0)
    return (
      <div className="text-center p-10 text-stone-500">
        Không tìm thấy dữ liệu.
      </div>
    );

  return (
    <div className="w-full h-full relative">
      <TreeToolbar
        scale={scale}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetZoom={handleResetZoom}
        handleCenter={handleCenter}
        hideExpandButtons={hideExpandButtons}
        setHideExpandButtons={setHideExpandButtons}
        autoCollapseLevel={autoCollapseLevel}
        setAutoCollapseLevel={setAutoCollapseLevel}
        hideDaughtersInLaw={hideDaughtersInLaw}
        setHideDaughtersInLaw={setHideDaughtersInLaw}
        hideSonsInLaw={hideSonsInLaw}
        setHideSonsInLaw={setHideSonsInLaw}
        hideDaughters={hideDaughters}
        setHideDaughters={setHideDaughters}
        hideSons={hideSons}
        setHideSons={setHideSons}
        hideMales={hideMales}
        setHideMales={setHideMales}
        hideFemales={hideFemales}
        setHideFemales={setHideFemales}
        canEdit={canEdit}
        maternalMode={maternalMode}
        setMaternalMode={setMaternalMode}
        clearMaternalOrigin={() => setMaternalOriginId(null)}
        maternalOriginName={maternalOriginId ? personsMap.get(maternalOriginId)?.full_name ?? null : null}
        diseases={diseases}
        activeDiseaseId={activeDiseaseId}
        setActiveDiseaseId={setActiveDiseaseId}
      />

      <div
        ref={containerRef}
        className={`w-full h-full overflow-auto bg-stone-50 ${isPressed ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()} // Prevent browser default dragging of links/images
      >
        {/* We use a style block to inject the CSS logic for the family tree lines */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
        .css-tree ul {
          padding-top: 30px; 
          position: relative;
          display: flex;
          justify-content: center;
          padding-left: 0;
          user-select: none;
        }

        .css-tree li {
          float: left; text-align: center;
          list-style-type: none;
          position: relative;
          padding: 30px 5px 0 5px;
        }

        /* Connecting lines */
        .css-tree li::before, .css-tree li::after {
          content: '';
          position: absolute; top: 0; right: 50%;
          border-top: 2px solid #d6d3d1;
          width: 50%; height: 30px;
        }
        .css-tree li::after {
          right: auto; left: 50%;
          border-left: 2px solid #d6d3d1;
        }

        /* Remove left-right connectors from elements without siblings */
        .css-tree li:only-child::after {
          display: none;
        }
        .css-tree li:only-child::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid #d6d3d1;
          width: 0;
          height: 30px;
        }

        /* Remove top connector from first child */
        .css-tree ul:first-child > li {
          padding-top: 0px;
        }
        .css-tree ul:first-child > li::before {
          display: none;
        }

        /* Remove left connector from first child and right connector from last child */
        .css-tree li:first-child::before, .css-tree li:last-child::after {
          border: 0 none;
        }

        /* Add back the vertical connector to the last nodes */
        .css-tree li:last-child::before {
          border-right: 2px solid #d6d3d1;
          border-radius: 0 12px 0 0;
        }
        .css-tree li:first-child::after {
          border-radius: 12px 0 0 0;
        }

        /* Downward connectors from parents */
        .css-tree ul ul::before {
          content: '';
          position: absolute; top: 0; left: 50%;
          border-left: 2px solid #d6d3d1;
          width: 0; height: 30px;
        }
      `,
          }}
        />

        {/* 
        Use w-max to prevent wrapping and allow scrolling. 
        mx-auto centers it if smaller than screen. 
        p-8 adds padding inside scroll area.
      */}
        <div
          id="export-container"
          className={`w-max min-w-full mx-auto p-4 css-tree transition-all duration-200 ${isDragging ? "opacity-90" : ""}`}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          <ul>
            {roots.map((root) => (
              <React.Fragment key={root.id}>
                {renderTreeNode(root.id)}
              </React.Fragment>
            ))}
          </ul>
        </div>
        {pickerPersonId && (
          <DiseasePickerModal
            personId={pickerPersonId}
            onClose={() => setPickerPersonId(null)}
            categoryFilter={null}
            onAssign={(personId, diseaseId, added) => {
              if (diseaseId && added) {
                // set as origin for quick propagation view
                setMaternalOriginId(personId);
                setMaternalMode(true);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
