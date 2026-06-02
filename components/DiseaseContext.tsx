"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Disease = {
  id: string;
  name: string;
  notes?: string;
  category?: string;
  color?: string;
  mechanism?: string; // 'autosomal_recessive' | 'autosomal_dominant' | 'mitochondrial' | 'x_linked' | 'custom'
  rules: {
    maternal: boolean;
    maleFactor: number;
    femaleFactor: number;
  };
};

// Support multiple disease ids per person
type Assignments = Record<string, string[]>; // personId -> array of diseaseIds
type PersonGenotypes = Record<string, string>;

const STORAGE_KEY = "giapha:diseases";
const ASSIGN_KEY = "giapha:person-diseases";
const GENOTYPE_KEY = "giapha:person-genotypes";

function loadDiseases(): Disease[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Disease[];
  } catch (e) {
    return [];
  }
}

function saveDiseases(list: Disease[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

function loadAssignments(): Assignments {
  try {
    const raw = localStorage.getItem(ASSIGN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as any;
    const out: Assignments = {};
    Object.keys(parsed).forEach((k) => {
      const v = parsed[k];
      if (v == null) out[k] = [];
      else if (Array.isArray(v)) out[k] = v;
      else out[k] = [v];
    });
    return out;
  } catch (e) {
    return {};
  }
}

function saveAssignments(a: Assignments) {
  try {
    localStorage.setItem(ASSIGN_KEY, JSON.stringify(a));
  } catch (e) {}
}

function loadPersonGenotypes(): PersonGenotypes {
  try {
    const raw = localStorage.getItem(GENOTYPE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersonGenotypes;
  } catch (e) {
    return {};
  }
}

function savePersonGenotypes(map: PersonGenotypes) {
  try {
    localStorage.setItem(GENOTYPE_KEY, JSON.stringify(map));
  } catch (e) {}
}

const DiseaseContext = createContext<any>(null);

export function DiseaseProvider({ children }: { children: React.ReactNode }) {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [assignments, setAssignments] = useState<Assignments>({});
  // diseaseId -> personId -> genotype ('AA'|'Aa'|'aa')
  const [genotypeAssignments, setGenotypeAssignments] = useState<Record<string, Record<string, string>>>({});
  const [personGenotypes, setPersonGenotypes] = useState<PersonGenotypes>({});

  useEffect(() => {
    let mounted = true;

    // Load local data first so user changes are preserved while we try server
    if (mounted) {
      setDiseases(loadDiseases());
      setAssignments(loadAssignments());
      setPersonGenotypes(loadPersonGenotypes());
    }

    (async () => {
      try {
        const res = await fetch(`/api/diseases`);
        if (res.ok) {
          const data = await res.json();
          // Only replace local data when server actually has entries
          if (mounted && Array.isArray(data) && data.length > 0) {
            setDiseases(data ?? []);
          }
        }

        const res2 = await fetch(`/api/diseases/assign`);
        if (res2.ok) {
          const assigns = await res2.json();
          if (Array.isArray(assigns) && assigns.length > 0) {
            const map: Assignments = {};
            (assigns ?? []).forEach((r: any) => {
              if (!map[r.person_id]) map[r.person_id] = [];
              if (r.disease_id) map[r.person_id].push(r.disease_id);
            });
            if (mounted) setAssignments(map);
          }
        }
      } catch (e) {
        // keep local data already loaded
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => saveDiseases(diseases), [diseases]);
  useEffect(() => saveAssignments(assignments), [assignments]);
  useEffect(() => savePersonGenotypes(personGenotypes), [personGenotypes]);

  function addDisease(d: Disease) {
    // try server first
    (async () => {
      try {
        const res = await fetch(`/api/diseases`, { method: "POST", body: JSON.stringify(d), headers: { "Content-Type": "application/json" } });
        if (res.ok) {
          const created = await res.json();
          setDiseases((s) => [created ?? d, ...s]);
          return;
        }
      } catch (e) {}
      // fallback to local
      setDiseases((s) => [d, ...s]);
    })();
  }

  function updateDisease(d: Disease) {
    (async () => {
      try {
        const res = await fetch(`/api/diseases/${d.id}`, { method: "PUT", body: JSON.stringify(d), headers: { "Content-Type": "application/json" } });
        if (res.ok) {
          const updated = await res.json();
          setDiseases((s) => s.map((x) => (x.id === d.id ? updated ?? d : x)));
          return;
        }
      } catch (e) {}
      setDiseases((s) => s.map((x) => (x.id === d.id ? d : x)));
    })();
  }

  function removeDisease(id: string) {
    (async () => {
      try {
        await fetch(`/api/diseases/${id}`, { method: "DELETE" });
      } catch (e) {}
      setDiseases((s) => s.filter((x) => x.id !== id));
    })();
    // remove assignments referencing this disease
    setAssignments((a) => {
      const next: Assignments = { ...a };
      Object.keys(next).forEach((k) => {
        next[k] = (next[k] || []).filter((x) => x !== id);
      });
      return next;
    });
  }

  // Toggle disease assignment for a person. If diseaseId is null => clear all assignments for that person.
  function assignDiseaseToPerson(personId: string, diseaseId: string | null) {
    (async () => {
      try {
        if (diseaseId) {
          await fetch(`/api/diseases/assign`, { method: "POST", body: JSON.stringify({ personId, diseaseId }), headers: { "Content-Type": "application/json" } });
        } else {
          await fetch(`/api/diseases/assign`, { method: "DELETE", body: JSON.stringify({ personId }), headers: { "Content-Type": "application/json" } });
        }
      } catch (e) {}

      setAssignments((a) => {
        const next: Assignments = { ...a };
        if (!diseaseId) {
          next[personId] = [];
          return next;
        }
        const list = new Set(next[personId] || []);
        if (list.has(diseaseId)) list.delete(diseaseId); else list.add(diseaseId);
        next[personId] = Array.from(list);
        return next;
      });
    })();
  }

  function setDiseasesForPerson(personId: string, diseaseIds: string[]) {
    (async () => {
      try {
        await fetch(`/api/diseases/assign`, { method: "POST", body: JSON.stringify({ personId, diseaseIds }), headers: { "Content-Type": "application/json" } });
      } catch (e) {}
      setAssignments((a) => ({ ...a, [personId]: diseaseIds }));
    })();
  }

  function setGenotypeForPerson(diseaseId: string, personId: string, genotype: string | null) {
    setGenotypeAssignments((g) => {
      const next = { ...(g || {}) };
      if (!next[diseaseId]) next[diseaseId] = {};
      if (!genotype) {
        delete next[diseaseId][personId];
      } else {
        next[diseaseId][personId] = genotype;
      }
      return next;
    });
  }

  function getGenotypeForPerson(diseaseId: string, personId: string) {
    return genotypeAssignments?.[diseaseId]?.[personId] ?? null;
  }

  function setPersonGenotype(personId: string, genotype: string | null) {
    setPersonGenotypes((prev) => {
      const next = { ...(prev || {}) };
      if (!genotype) {
        delete next[personId];
      } else {
        next[personId] = genotype;
      }
      return next;
    });
  }

  function getPersonGenotype(personId: string) {
    return personGenotypes?.[personId] ?? null;
  }

  function getAssignedDisease(personId: string) {
    const arr = assignments[personId] ?? [];
    if (!arr || arr.length === 0) return null;
    const id = arr[0];
    return diseases.find((d) => d.id === id) ?? null;
  }

  function getAssignedDiseases(personId: string) {
    const arr = assignments[personId] ?? [];
    return (arr || []).map((id) => diseases.find((d) => d.id === id)).filter(Boolean) as Disease[];
  }

  return (
    <DiseaseContext.Provider
      value={{
        diseases,
        addDisease,
        updateDisease,
        removeDisease,
        assignments,
        assignDiseaseToPerson,
        setDiseasesForPerson,
        getAssignedDisease,
        getAssignedDiseases,
        genotypeAssignments,
        setGenotypeForPerson,
        getGenotypeForPerson,
        personGenotypes,
        setPersonGenotype,
        getPersonGenotype,
      }}
    >
      {children}
    </DiseaseContext.Provider>
  );
}

export function useDiseaseContext() {
  const ctx = useContext(DiseaseContext);
  if (!ctx) throw new Error("useDiseaseContext must be used within DiseaseProvider");
  return ctx as any;
}
