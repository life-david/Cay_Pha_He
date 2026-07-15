export interface KinshipResult {
  /** Person A gọi Person B là gì */
  aCallsB: string;
  /** Person B gọi Person A là gì */
  bCallsA: string;
  /** Mô tả chi tiết nhánh quan hệ */
  description: string;
  /** Số bậc cách nhau */
  distance: number;
  /** Số đời từ A tới tổ tiên chung (LCA) */
  depthA?: number;
  /** Số đời từ B tới tổ tiên chung (LCA) */
  depthB?: number;
  /** Các bước quan hệ chi tiết */
  pathLabels: string[];
  /** B là vai trên so với A (hoặc ngược lại tùy ngữ cảnh) */
  isSenior?: boolean | null;
}

export interface PersonNode {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_order: number | null;
  generation: number | null;
  is_in_law: boolean;
}

interface RelEdge {
  type: "marriage" | "biological_child" | "adopted_child" | string;
  person_a: string;
  person_b: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * So sánh thứ bậc giữa hai người (cùng bố mẹ hoặc cùng thế hệ)
 * Chỉ dựa trên Thứ tự sinh (birth_order).
 */
function compareSeniority(
  a: PersonNode,
  b: PersonNode,
): "senior" | "junior" | "equal" {
  if (a.id === b.id) return "equal";

  if (a.birth_order != null && b.birth_order != null) {
    if (a.birth_order < b.birth_order) return "senior";
    if (a.birth_order > b.birth_order) return "junior";
  }

  return "equal";
}

// ── Vietnamese Terminology Constants ──────────────────────────────────────

const ANCESTORS = [
  "",
  "Bố/Mẹ",
  "Ông/Bà",
  "Cụ",
  "Kỵ",
  "Sơ",
  "Tiệm",
  "Tiểu",
  "Di",
  "Diễn",
];
const DESCENDANTS = [
  "",
  "Con",
  "Cháu",
  "Chắt",
  "Chít",
  "Chút",
  "Chét",
  "Chót",
  "Chẹt",
];

/**
 * Lấy danh xưng trực hệ vế trên
 */
function getDirectAncestorTerm(
  depth: number,
  gender: "male" | "female" | "other",
  isPaternal: boolean,
): string {
  if (depth === 1) return gender === "female" ? "Mẹ" : "Bố";
  if (depth === 2) {
    const base = gender === "female" ? "Bà" : "Ông";
    return `${base} ${isPaternal ? "nội" : "ngoại"}`;
  }
  if (depth === 3) return `Cụ ${isPaternal ? "nội" : "ngoại"}`;
  if (depth === 4) return `Kỵ ${isPaternal ? "nội" : "ngoại"}`;
  return ANCESTORS[depth] || `Tổ đời ${depth}`;
}

function getCollateralAncestorStem(
  depth: number,
  gender: "male" | "female" | "other",
): string {
  if (depth === 1) return gender === "female" ? "Mẹ" : "Bố";
  if (depth === 2) return gender === "female" ? "Bà" : "Ông";
  if (depth === 3 || depth === 4) return "Cụ";
  return "Kỵ";
}

/**
 * Lấy danh xưng trực hệ vế dưới
 */
function getDirectDescendantTerm(depth: number): string {
  if (depth === 1) return "Con";
  if (depth === 2) return "Cháu";
  if (depth === 3) return "Chắt";
  if (depth === 4) return "Chít";
  return DESCENDANTS[depth] || `Cháu đời ${depth}`;
}

function getPaternalCollateralTerm(
  gender: "male" | "female" | "other",
  seniority: "senior" | "junior" | "equal",
): string {
  if (gender === "female") {
    return "Cô";
  }

  if (seniority === "senior") return "Bác";
  return "Chú";
}

function getMaternalCollateralTerm(
  gender: "male" | "female" | "other",
  seniority: "senior" | "junior" | "equal",
): string {
  if (seniority === "senior") {
    return gender === "female" ? "Bá" : "Bác";
  }
  return gender === "female" ? "Dì" : "Cậu";
}

function getKinshipTitleHint(fullName: string): string | null {
  const normalized = fullName.trim().toLowerCase();
  if (normalized.startsWith("chú ")) return "Chú";
  if (normalized.startsWith("bác ")) return "Bác";
  if (normalized.startsWith("cô ")) return "Cô";
  if (normalized.startsWith("dì ")) return "Dì";
  if (normalized.startsWith("thím ")) return "Thím";
  return null;
}

// ── Core Algorithm ──────────────────────────────────────────────────────────

/**
 * Giải quyết danh xưng huyết thống giữa A và B
 */
function resolveBloodTerms(
  depthA: number,
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  pathA: PersonNode[], // Từ A lên tới LCA (không bao gồm LCA)
  pathB: PersonNode[], // Từ B lên tới LCA (không bao gồm LCA)
  isPaternalA: boolean | null,
  isPaternalB: boolean | null,
): [string, string, string] {
  const genderA = personA.gender;
  const genderB = personB.gender;

  // 1. QUAN HỆ TRỰC HỆ (A là con cháu B hoặc ngược lại)
  if (depthA === 0) {
    // A chính là LCA. B là con cháu của A.
    if (isPaternalB == null) return ["Hậu duệ", "Tiền bối", "Quan hệ Trực hệ"];

    const bCallsA = getDirectAncestorTerm(depthB, genderA, isPaternalB);
    const aCallsB = getDirectDescendantTerm(depthB);
    return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
  }

  if (depthB === 0) {
    // B chính là LCA. A là con cháu của B.
    if (isPaternalA == null) return ["Tiền bối", "Hậu duệ", "Quan hệ Trực hệ"];

    const aCallsB = getDirectAncestorTerm(depthA, genderB, isPaternalA);
    const bCallsA = getDirectDescendantTerm(depthA);
    return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
  }

  // 2. QUAN HỆ NGANG HÀNG (Anh chị em ruột hoặc họ hàng)
  const branchA = pathA[pathA.length - 1]; // Con của LCA phía A
  const branchB = pathB[pathB.length - 1]; // Con của LCA phía B

  if (!branchA || !branchB) return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];

  // Seniority của B so với tổ tiên của A (để biết B là Bác/Bá hay Chú/Cậu/Dì)
  const bSeniorityToAncestorA = compareSeniority(personB, branchA);
  // Seniority của A so với tổ tiên của B
  const aSeniorityToAncestorB = compareSeniority(personA, branchB);
  // Seniority giữa hai nhánh (cho anh em họ)
  const branchSeniority = compareSeniority(branchA, branchB);

  // Xác định vế Nội/Ngoại theo nhánh xuất phát từ A
  if (isPaternalA == null) return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];

  // Anh chị em ruột (Cùng bố hoặc mẹ)
  if (depthA === 1 && depthB === 1) {
    const aSenior = compareSeniority(personA, personB);
    if (aSenior === "senior") {
      return [
        genderB === "female" ? "Em gái" : "Em trai",
        genderA === "female" ? "Chị gái" : "Anh trai",
        "Anh chị em ruột",
      ];
    }

    return [
      genderB === "female" ? "Chị gái" : "Anh trai",
      genderA === "female" ? "Em gái" : "Em trai",
      "Anh chị em ruột",
    ];
  }

  // Chú/Bác/Cô/Cậu/Dì (Vế trên - Vế dưới)
  if (depthA > 1 && depthB === 1) {
    // B là anh/chị/em của tổ tiên A
    let termForB = "";
    const isPaternalSide = isPaternalA;

    if (isPaternalSide) {
      // Bên Nội (anh/chị ruột hoặc họ của bố)
      // - Anh/chị lớn hơn bố: Bác
      // - Em trai của bố: Chú
      // - Em gái của bố: Cô
      const hint = getKinshipTitleHint(personB.full_name);
      if (hint === "Chú") termForB = "Chú";
      else if (hint === "Bác") termForB = "Bác";
      else if (hint === "Cô") termForB = "Cô";
      else termForB = getPaternalCollateralTerm(genderB, bSeniorityToAncestorA);
    } else {
      // Bên Ngoại (anh/chị ruột hoặc họ của mẹ)
      termForB = getMaternalCollateralTerm(genderB, bSeniorityToAncestorA);
    }

    // Nếu cách nhiều đời (ví dụ B là anh của ông nội)
    let prefix = "";
    if (depthA === 3) {
      return [
        genderB === "female" ? "Bà Họ" : "Ông Họ",
        "Cháu Họ",
        isPaternalSide ? "Bên Nội (Vế trên)" : "Bên Ngoại (Vế trên)",
      ];
    } else if (depthA === 4) {
      prefix = `${genderB === "female" ? "Cụ bà" : "Cụ ông"} ${isPaternalSide ? "nội" : "ngoại"} `;
    } else if (depthA > 4) {
      prefix = `${ANCESTORS[depthA - 1]} ${isPaternalSide ? "nội" : "ngoại"} `;
    }

    const descendantTerm = !isPaternalSide && depthA === 3
      ? "Cháu"
      : getDirectDescendantTerm(depthA);

    const resolvedTermForB = ["Bác", "Chú", "Cô", "Bá", "Dì"].includes(termForB) && !termForB.includes("họ")
      ? `${termForB} họ`
      : termForB;

    return [
      (prefix + resolvedTermForB).trim(),
      descendantTerm,
      isPaternalSide ? "Bên Nội (Vế trên)" : "Bên Ngoại (Vế trên)",
    ];
  }

  // Ngược lại của trường hợp trên
  if (depthA === 1 && depthB > 1) {
    const [bCallsA, aCallsB, desc] = resolveBloodTerms(
      depthB,
      depthA,
      personB,
      personA,
      pathB,
      pathA,
      isPaternalB,
      isPaternalA,
    );
    return [aCallsB, bCallsA, desc];
  }

  // Anh em họ (Cùng thế hệ hoặc lệch thế hệ nhưng không trực hệ)
  if (depthA > 1 && depthB > 1) {
    const side = isPaternalA === true || isPaternalB === true ? "Nội" : "Ngoại";

    if (depthA === depthB) {
      // Cùng thế hệ
      // Ưu tiên tuyệt đối vai vế theo tổ tiên (cha/mẹ)
      const currentSeniority = branchSeniority === "equal" ? "junior" : branchSeniority;

      // Anh/chị/em họ luôn giữ hậu tố để phân biệt với anh/chị/em ruột
      const suffix = " họ";

      if (currentSeniority === "senior") {
        // Cha mẹ A lớn hơn cha mẹ B -> A là vai trên, B là vai dưới
        // A gọi B là Em, B gọi A là Anh/Chị
        return [
          `Em${suffix}`,
          genderA === "female" ? `Chị${suffix}` : `Anh${suffix}`,
          `Anh em${suffix} ${side}`,
        ];
      } else {
        // Cha mẹ B lớn hơn cha mẹ A -> B là vai trên, A là vai dưới
        // A gọi B là Anh/Chị, B gọi A là Em
        return [
          genderB === "female" ? `Chị${suffix}` : `Anh${suffix}`,
          `Em${suffix}`,
          `Anh em${suffix} ${side}`,
        ];
      }
    } else {
      // Lệch thế hệ
      const genDiff = depthA - depthB;
      if (genDiff > 0) {
        // B ở vế trên
        let termForB = "Họ hàng";
        if (genDiff === 1) {
          const isPaternalSide = isPaternalA;
          if (isPaternalSide == null) return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];

          const isClose = (depthA + depthB) <= 4;
          const suffix = isClose ? "" : " họ";

          if (isPaternalSide) {
            const hint = getKinshipTitleHint(personB.full_name);
            if (hint === "Chú") {
              termForB = `Chú${suffix}`;
            } else if (hint === "Bác") {
              termForB = `Bác${suffix}`;
            } else if (hint === "Cô") {
              termForB = `Cô${suffix}`;
            } else {
              termForB = genderB === "female"
                ? `Cô${suffix}`
                : bSeniorityToAncestorA === "junior"
                  ? `Chú${suffix}`
                  : `Bác${suffix}`;
            }
          } else {
            const hint = getKinshipTitleHint(personB.full_name);
            if (hint === "Dì") {
              termForB = `Dì${suffix}`;
            } else if (hint === "Bá") {
              termForB = `Bá${suffix}`;
            } else if (hint === "Cô") {
              termForB = `Cô${suffix}`;
            } else {
              termForB = getMaternalCollateralTerm(genderB, bSeniorityToAncestorA);
              if (!isClose) {
                termForB += " họ";
              }
            }
          }
        } else {
          const isPaternalSide = isPaternalA;
          if (isPaternalSide == null) return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];

          const ancestorDepth = genDiff;
          const baseTerm = getCollateralAncestorStem(ancestorDepth, genderB);
          termForB = `${baseTerm} họ`;
        }
        const descendantSuffix = (depthA + depthB) <= 4 ? "" : " Họ";
        return [termForB, `Cháu${descendantSuffix}`, `Họ hàng ${side}`];
      } else {
        const [bCallsA, aCallsB, desc] = resolveBloodTerms(
          depthB,
          depthA,
          personB,
          personA,
          pathB,
          pathA,
          isPaternalB,
          isPaternalA,
        );
        return [aCallsB, bCallsA, desc];
      }
    }
  }

  return ["Người trong họ", "Người trong họ", "Quan hệ họ hàng"];
}

// ── Data Processing ──────────────────────────────────────────────────────────

function getAncestryData(
  id: string,
  parentMap: Map<string, string[]>,
  personsMap: Map<string, PersonNode>,
) {
  const depths = new Map<string, { depth: number; path: PersonNode[]; side: boolean | null }>();
  const queue: { id: string; depth: number; path: PersonNode[]; side: boolean | null }[] = [
    { id, depth: 0, path: [], side: null },
  ];

  function shouldPreferPath(
    existing: { depth: number; path: PersonNode[]; side: boolean | null },
    next: { depth: number; path: PersonNode[]; side: boolean | null },
  ): boolean {
    const existingSide = existing.side;
    const nextSide = next.side;

    if (existingSide === false && nextSide !== false) return true;
    if (existingSide !== false && nextSide === false) return false;

    return false;
  }

  while (queue.length > 0) {
    const { id: currentId, depth, path, side: currentSide } = queue.shift()!;
    const existing = depths.get(currentId);
    if (!existing) {
      depths.set(currentId, { depth, path, side: currentSide });
    } else if (depth < existing.depth) {
      depths.set(currentId, { depth, path, side: currentSide });
    } else if (depth === existing.depth && shouldPreferPath(existing, { depth, path, side: currentSide })) {
      depths.set(currentId, { depth, path, side: currentSide });
    } else {
      continue;
    }

    const currentNode = personsMap.get(currentId);
    if (!currentNode) continue;

    const parents = parentMap.get(currentId) ?? [];
    for (const pId of parents) {
      const pNode = personsMap.get(pId);
      if (pNode) {
        const pSide = (depth === 0) 
          ? (pNode.gender === "male" ? true : pNode.gender === "female" ? false : null)
          : currentSide;
          
        queue.push({
          id: pId,
          depth: depth + 1,
          path: [...path, currentNode],
          side: pSide,
        });
      }
    }
  }
  return depths;
}

function findBloodKinship(
  personA: PersonNode,
  personB: PersonNode,
  personsMap: Map<string, PersonNode>,
  parentMap: Map<string, string[]>,
): KinshipResult | null {
  const ancA = getAncestryData(personA.id, parentMap, personsMap);
  const ancB = getAncestryData(personB.id, parentMap, personsMap);

  const candidates: Array<{
    id: string;
    distance: number;
    sideA: boolean | null;
    sideB: boolean | null;
    sideScore: number;
  }> = [];

  for (const [id, dataA] of ancA) {
    if (ancB.has(id)) {
      const dataB = ancB.get(id)!;
      const dist = dataA.depth + dataB.depth;
      const sideA = dataA.side;
      const sideB = dataB.side;
      const sideScore =
        sideA === true && sideB === true
          ? 0
          : sideA === false && sideB === false
            ? 2
            : 1;

      candidates.push({
        id,
        distance: dist,
        sideA,
        sideB,
        sideScore,
      });
    }
  }

  if (candidates.length === 0) return null;

  const paternalCandidates = candidates.filter(
    (candidate) => candidate.sideA === true && candidate.sideB === true,
  );

  const rankingPool = paternalCandidates.length > 0 ? paternalCandidates : candidates;

  // Ưu tiên tuyệt đối khoảng cách ngắn nhất (Tổ tiên chung gần nhất)
  let best = rankingPool[0];
  for (const candidate of rankingPool.slice(1)) {
    if (
      candidate.distance < best.distance ||
      (candidate.distance === best.distance && candidate.sideScore < best.sideScore) ||
      (
        candidate.distance === best.distance &&
        candidate.sideScore === best.sideScore &&
        candidate.sideA === true &&
        best.sideA !== true
      )
    ) {
      best = candidate;
    }
  }

  const lcaId = best.id;
  const minDistance = best.distance;

  const dataA = ancA.get(lcaId)!;
  const dataB = ancB.get(lcaId)!;

  const [aCallsB, bCallsA, description] = resolveBloodTerms(
    dataA.depth,
    dataB.depth,
    personA,
    personB,
    dataA.path,
    dataB.path,
    dataA.side,
    dataB.side,
  );

  // Xác định isSenior: B có là vai trên so với A không?
  let isSenior: boolean | null = null;
  if (dataA.depth > 0 && dataB.depth > 0) {
    const branchA = dataA.path[dataA.path.length - 1];
    const branchB = dataB.path[dataB.path.length - 1];
    if (branchA && branchB) {
      const seniority = compareSeniority(personB, branchA);
      isSenior = seniority === "senior";
    }
  } else if (dataA.depth > 0) {
    isSenior = true;
  } else if (dataB.depth > 0) {
    isSenior = false;
  }

  const lcaName = personsMap.get(lcaId)?.full_name ?? "Tổ tiên chung";
  const pathParts: string[] = [];
  if (personA.id !== lcaId) {
    pathParts.push(`${personA.full_name} cách ${lcaName} ${dataA.depth} đời.`);
  }
  if (personB.id !== lcaId) {
    pathParts.push(`${personB.full_name} cách ${lcaName} ${dataB.depth} đời.`);
  }

  return {
    aCallsB,
    bCallsA,
    description: `${description} (Tổ tiên chung: ${lcaName})`,
    distance: minDistance,
    depthA: dataA.depth,
    depthB: dataB.depth,
    pathLabels: pathParts,
    isSenior,
  };
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

export function computeKinship(
  personA: PersonNode,
  personB: PersonNode,
  persons: PersonNode[],
  relationships: RelEdge[],
): KinshipResult | null {
  if (personA.id === personB.id) return null;

  const personsMap = new Map(persons.map((p) => [p.id, p]));
  const parentMap = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();
  const childrenMap = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      const p = parentMap.get(r.person_b) ?? [];
      p.push(r.person_a);
      parentMap.set(r.person_b, p);
    } else if (r.type === "marriage") {
      const sA = spouseMap.get(r.person_a) ?? [];
      sA.push(r.person_b);
      spouseMap.set(r.person_a, sA);
      const sB = spouseMap.get(r.person_b) ?? [];
      sB.push(r.person_a);
      spouseMap.set(r.person_b, sB);
    }
  }

  // Build childrenMap: parentId -> [childIds]
  for (const [childId, parents] of parentMap.entries()) {
    for (const pId of parents) {
      const arr = childrenMap.get(pId) ?? [];
      arr.push(childId);
      childrenMap.set(pId, arr);
    }
  }

  // 0. Kiểm tra quan hệ hôn nhân trực tiếp
  const spousesA = spouseMap.get(personA.id) ?? [];
  if (spousesA.includes(personB.id)) {
    return {
      aCallsB: personB.gender === "female" ? "Vợ" : "Chồng",
      bCallsA: personA.gender === "female" ? "Vợ" : "Chồng",
      description: "Quan hệ Hôn nhân",
      distance: 0,
      pathLabels: [`${personA.full_name} và ${personB.full_name} là vợ chồng.`],
    };
  }

  // 1. Kiểm tra quan hệ huyết thống
  const blood = findBloodKinship(personA, personB, personsMap, parentMap);
  if (blood) return blood;

  // 2. Kiểm tra quan hệ thông qua hôn nhân của A
  for (const sId of spousesA) {
    if (sId === personB.id) continue; // Đã xử lý ở bước 0
    const spouseA = personsMap.get(sId);
    if (!spouseA) continue;
    const res = findBloodKinship(spouseA, personB, personsMap, parentMap);

    if (res) {
      let aCallsB = res.aCallsB;
      let bCallsA = res.bCallsA;

      // --- A gọi B thông qua spouseA ---
      // A gọi người trong họ của vợ/chồng mình
      const suffix = personA.gender === "male" ? " vợ" : " chồng";

      if (
        res.aCallsB === "Bố" ||
        res.aCallsB === "Mẹ" ||
        res.aCallsB.startsWith("Ông") ||
        res.aCallsB.startsWith("Bà") ||
        res.aCallsB.startsWith("Cụ")
      ) {
        aCallsB = res.aCallsB + suffix;
      } else if (res.aCallsB.includes("Anh trai")) {
        aCallsB = "Anh" + suffix;
      } else if (res.aCallsB.includes("Chị gái")) {
        aCallsB = "Chị" + suffix;
      } else if (res.aCallsB === "Em họ") {
        aCallsB = "Em " + suffix + " (họ)";
      } else if (res.aCallsB === "Chị họ") {
        aCallsB = "Chị " + suffix + " (họ)";
      } else if (res.aCallsB === "Anh họ") {
        aCallsB = "Anh " + suffix + " (họ)";
      } else if (res.aCallsB.includes("Em")) {
        aCallsB = "Em" + suffix;
      } else if (
        ["Bác", "Chú", "Cô", "Cậu", "Dì"].includes(res.aCallsB) ||
        res.aCallsB.endsWith(" họ")
      ) {
        aCallsB = res.aCallsB.replace(" họ", "") + suffix;
      }

      // --- B gọi A thông qua spouseA ---
      // Người trong họ của spouseA gọi A (là dâu/rể)
      if (res.bCallsA === "Con") {
        bCallsA = personA.gender === "male" ? "Con rể" : "Con dâu";
      } else if (res.bCallsA === "Cháu") {
        bCallsA = personA.gender === "male" ? "Cháu rể" : "Cháu dâu";
      } else if (res.bCallsA === "Anh" || res.bCallsA.includes("Anh trai")) {
        bCallsA = personA.gender === "male" ? "Anh rể" : "Chị dâu";
      } else if (res.bCallsA === "Chị" || res.bCallsA.includes("Chị gái")) {
        bCallsA = personA.gender === "male" ? "Anh rể" : "Chị dâu";
      } else if (res.bCallsA.includes("Em")) {
        bCallsA = personA.gender === "male" ? "Em rể" : "Em dâu";
        if (res.bCallsA.includes("họ")) {
          bCallsA += " (họ)";
        }
      } else if (res.bCallsA === "Chị họ") {
        bCallsA = "Anh rể (họ)";
      } else if (res.bCallsA === "Anh họ") {
        bCallsA = "Chị dâu (họ)";
      } else if (res.bCallsA === "Chú") {
        bCallsA = "Thím";
      } else if (res.bCallsA === "Chú họ") {
        bCallsA = "Bác họ";
      } else if (res.bCallsA === "Bác họ") {
        bCallsA = "Bác họ";
      } else if (res.bCallsA === "Bác") {
        bCallsA = "Bác";
      } else if (res.bCallsA === "Bá") {
        bCallsA = "Dì";
      } else if (res.bCallsA === "Bá họ") {
        bCallsA = "Dì họ";
      } else if (res.bCallsA === "Cô") {
        bCallsA = res.isSenior ? "Bác" : "Chú";
      } else if (res.bCallsA === "Cậu") {
        bCallsA = "Mợ";
      } else if (res.bCallsA === "Dì") {
        bCallsA = "Dì";
      } else if (res.bCallsA === "Cô họ") {
        bCallsA = "Bác họ";
      } else if (res.bCallsA === "Cậu họ") {
        bCallsA = "Mợ họ";
      } else if (res.bCallsA === "Dì họ") {
        bCallsA = "Dì họ";
      } else if (res.bCallsA === "Bà Họ") {
        bCallsA = "Ông Họ";
      } else if (res.bCallsA === "Ông Họ") {
        bCallsA = "Bà Họ";
      } else if (res.bCallsA === "Bà Cô") {
        bCallsA = "Ông Chú";
      } else if (res.bCallsA === "Ông Chú") {
        bCallsA = "Bà Thím";
      } else if (res.bCallsA === "Ông Bác") {
        bCallsA = "Bà Bác";
      } else {
        bCallsA =
          (personA.gender === "male" ? "Chồng" : "Vợ") + " của " + res.bCallsA;
      }

      return {
        ...res,
        aCallsB,
        bCallsA,
        description: `Thông qua hôn nhân của ${spouseA.full_name}`,
        pathLabels: [
          `${personA.full_name} là ${personA.gender === "male" ? "Chồng" : "Vợ"} của ${spouseA.full_name}`,
          ...res.pathLabels,
        ],
      };
    }
  }

  // 3. Kiểm tra quan hệ thông qua hôn nhân của B
  const spousesB = spouseMap.get(personB.id) ?? [];
  for (const sId of spousesB) {
    const spouseB = personsMap.get(sId);
    if (!spouseB) continue;
    const res = findBloodKinship(personA, spouseB, personsMap, parentMap);
    if (res) {
      let aCallsB = res.aCallsB;
      let bCallsA = res.bCallsA;

      // --- A gọi B thông qua spouseB ---
      // A gọi spouse của người thân mình (S)
      if (res.aCallsB === "Con") {
        aCallsB = personB.gender === "male" ? "Con rể" : "Con dâu";
      } else if (res.aCallsB === "Cháu") {
        aCallsB = personB.gender === "male" ? "Cháu rể" : "Cháu dâu";
      } else if (res.aCallsB === "Anh" || res.aCallsB.includes("Anh trai")) {
        aCallsB = personB.gender === "female" ? "Chị dâu" : "Anh rể";
      } else if (res.aCallsB === "Chị" || res.aCallsB.includes("Chị gái")) {
        aCallsB = personB.gender === "male" ? "Anh rể" : "Chị dâu";
      } else if (res.aCallsB.includes("Chị họ")) {
        aCallsB = "Anh rể (họ)";
      } else if (res.aCallsB.includes("Anh họ")) {
        aCallsB = "Chị dâu (họ)";
      } else if (res.aCallsB.includes("Em")) {
        aCallsB = personB.gender === "male" ? "Em rể (họ)" : "Em dâu (họ)";
      } else if (res.aCallsB === "Chú") {
        aCallsB = "Thím";
      } else if (res.aCallsB === "Chú họ") {
        aCallsB = "Thím họ";
      } else if (res.aCallsB === "Bác họ") {
        aCallsB = "Bác họ";
      } else if (res.aCallsB === "Bác") {
        aCallsB = "Bác";
      } else if (res.aCallsB === "Bá") {
        aCallsB = "Bác";
      } else if (res.aCallsB === "Cô") {
        aCallsB = "Chú";
      } else if (res.aCallsB === "Cậu") {
        aCallsB = "Mợ";
      } else if (res.aCallsB === "Dì") {
        aCallsB = "Dì";
      } else if (res.aCallsB === "Cô họ") {
        aCallsB = "Bác họ";
      } else if (res.aCallsB === "Cậu họ") {
        aCallsB = "Mợ họ";
      } else if (res.aCallsB === "Dì họ") {
        aCallsB = "Dì họ";
      } else if (res.aCallsB === "Bà Họ") {
        aCallsB = "Ông Họ";
      } else if (res.aCallsB === "Ông Họ") {
        aCallsB = "Bà Họ";
      } else if (res.aCallsB === "Bà Cô") {
        aCallsB = "Ông Chú";
      } else if (res.aCallsB === "Ông Chú") {
        aCallsB = "Bà Thím";
      } else if (res.aCallsB === "Ông Bác") {
        aCallsB = "Bà Bác";
      } else {
        aCallsB =
          (personB.gender === "male" ? "Chồng" : "Vợ") + " của " + res.aCallsB;
      }

      // --- B gọi A thông qua spouseB ---
      // B gọi người thân của vợ/chồng mình (spouseB)
      const suffix = personB.gender === "male" ? " vợ" : " chồng";

      if (
        res.bCallsA === "Bố" ||
        res.bCallsA === "Mẹ" ||
        res.bCallsA.startsWith("Ông") ||
        res.bCallsA.startsWith("Bà") ||
        res.bCallsA.startsWith("Cụ")
      ) {
        bCallsA = res.bCallsA + suffix;
      } else if (res.bCallsA.includes("Anh trai")) {
        bCallsA = "Anh" + suffix;
      } else if (res.bCallsA.includes("Chị gái")) {
        bCallsA = "Chị" + suffix;
      } else if (res.bCallsA === "Em họ") {
        bCallsA = "Em" + suffix + " (họ)";
      } else if (res.bCallsA === "Chị họ") {
        bCallsA = "Chị" + suffix + " (họ)";
      } else if (res.bCallsA === "Anh họ") {
        bCallsA = "Anh" + suffix + " (họ)";
      } else if (res.bCallsA.includes("Em")) {
        bCallsA = "Em" + suffix;
      } else if (
        ["Bác", "Chú", "Cô", "Cậu", "Dì"].includes(res.bCallsA) ||
        res.bCallsA.endsWith(" họ")
      ) {
        bCallsA = res.bCallsA + suffix;
      }

      return {
        ...res,
        aCallsB,
        bCallsA,
        description: `Thông qua hôn nhân của ${spouseB.full_name}`,
        pathLabels: [
          ...res.pathLabels,
          `${personB.full_name} là ${personB.gender === "male" ? "Chồng" : "Vợ"} của ${spouseB.full_name}`,
        ],
      };
    }
  }

  // 4. Kiểm tra quan hệ thông qua cả hôn nhân của A và B
  for (const sIdA of spousesA) {
    const spouseA = personsMap.get(sIdA);
    if (!spouseA) continue;
    for (const sIdB of spousesB) {
      if (sIdA === sIdB) continue;
      const spouseB = personsMap.get(sIdB);
      if (!spouseB) continue;

      const res = findBloodKinship(spouseA, spouseB, personsMap, parentMap);
      if (res) {
        // res trả về cách gọi người thân của vợ/chồng mình (spouse) nên đổi ngôi
        const prefixA = personA.gender === "male" ? "Chồng" : "Vợ";
        const prefixB = personB.gender === "male" ? "Chồng" : "Vợ";

        let aCallsB = `${prefixB} của ${res.aCallsB}`;
        let bCallsA = `${prefixA} của ${res.bCallsA}`;

        // Đặc biệt: Anh em cột chèo / Chị em dâu (nếu spouseA và spouseB là anh chị em ruột)
        if (res.description.includes("Anh chị em ruột")) {
          if (
            personA.gender === "male" &&
            personB.gender === "male" &&
            spouseA.gender === "female" &&
            spouseB.gender === "female"
          ) {
            aCallsB = "Anh em cột chèo";
            bCallsA = "Anh em cột chèo";
          } else if (
            personA.gender === "female" &&
            personB.gender === "female" &&
            spouseA.gender === "male" &&
            spouseB.gender === "male"
          ) {
            aCallsB = "Chị em dâu";
            bCallsA = "Chị em dâu";
          }
        }

        return {
          ...res,
          aCallsB,
          bCallsA,
          description: `Thông qua hôn nhân của cả ${spouseA.full_name} và ${spouseB.full_name}`,
          pathLabels: [
            `${personA.full_name} là ${prefixA} của ${spouseA.full_name}`,
            ...res.pathLabels,
            `${personB.full_name} là ${prefixB} của ${spouseB.full_name}`,
          ],
        };
      }
    }
  }

  // 5. Kiểm tra trường hợp Thông gia: con của A kết hôn với con của B
  const childrenA = childrenMap.get(personA.id) ?? [];
  const childrenB = childrenMap.get(personB.id) ?? [];
  for (const cA of childrenA) {
    const spousesOfAChild = spouseMap.get(cA) ?? [];
    for (const cB of childrenB) {
      if (spousesOfAChild.includes(cB)) {
        const childA = personsMap.get(cA)!;
        const childB = personsMap.get(cB)!;
        const aCallsB = (personA.gender === "male" ? "Ông" : "Bà") +
          ` thông gia (phụ huynh của ${childA.full_name})`;
        const bCallsA = (personB.gender === "male" ? "Ông" : "Bà") +
          ` thông gia (phụ huynh của ${childB.full_name})`;
        return {
          aCallsB,
          bCallsA,
          description: `Thông gia (Con ${childA.full_name} kết hôn với ${childB.full_name})`,
          distance: 0,
          pathLabels: [
            `${childA.full_name} kết hôn với ${childB.full_name}`,
            `${personA.full_name} là phụ huynh của ${childA.full_name}`,
            `${personB.full_name} là phụ huynh của ${childB.full_name}`,
          ],
        };
      }
    }
  }

  return {
    aCallsB: "Chưa xác định",
    bCallsA: "Chưa xác định",
    description: "Không tìm thấy quan hệ trong phạm vi dữ liệu",
    distance: -1,
    pathLabels: [],
  };
}

export function computeBloodKinship(
  personA: PersonNode,
  personB: PersonNode,
  persons: PersonNode[],
  relationships: RelEdge[],
): KinshipResult | null {
  if (personA.id === personB.id) return null;

  const personsMap = new Map(persons.map((p) => [p.id, p]));
  const parentMap = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      const p = parentMap.get(r.person_b) ?? [];
      p.push(r.person_a);
      parentMap.set(r.person_b, p);
    }
  }

  return findBloodKinship(personA, personB, personsMap, parentMap);
}
