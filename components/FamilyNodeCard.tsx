"use client";

import { Person } from "@/types";
import { getAvatarBg } from "@/utils/styleHelprs";
import Image from "next/image";
import { useDashboard } from "./DashboardContext";
import DefaultAvatar from "./DefaultAvatar";
import { useDiseaseContext } from "./DiseaseContext";

interface FamilyNodeCardProps {
  person: Person;
  role?: string; // e.g., "Chồng", "Vợ"
  note?: string | null;
  onClickCard?: () => void;
  onClickName?: (e: React.MouseEvent) => void;
  isRingVisible?: boolean;
  isPlusVisible?: boolean;
  level: number;
  diseaseProb?: number; // 0..1, undefined or 0 => no highlight
  isDiseaseOrigin?: boolean;
  onDiseaseClick?: (e: React.MouseEvent) => void;
  showGenotypeControls?: boolean;
  activeDiseaseId?: string | null;
  genotypeProbabilities?: { AA: number; Aa: number; aa: number } | null;
  showGenotypeProbabilities?: boolean;
  childrenCount?: number;
  childrenNames?: string[];
  hasSpouse?: boolean;
  isKinWarning?: boolean;
}

export default function FamilyNodeCard({
  person,
  onClickCard,
  onClickName,
  isRingVisible = false,
  isPlusVisible = false,
  isKinWarning = false,
  hasSpouse = false,
  // disease highlight props
  diseaseProb = 0,
  isDiseaseOrigin = false,
  showGenotypeControls = false,
  activeDiseaseId = null,
  genotypeProbabilities = null,
  showGenotypeProbabilities = false,
  childrenCount = 0,
  childrenNames = [],
}: FamilyNodeCardProps) {
  const { showAvatar, setMemberModalId, setRootId, view: currentView, setView } = useDashboard();
  const { getAssignedDiseases, setGenotypeForPerson, getGenotypeForPerson, getPersonGenotype, setPersonGenotype } = useDiseaseContext();

  const isDeceased = person.is_deceased;

  const assignedDiseases = getAssignedDiseases(person.id);
  const primaryColor = assignedDiseases[0]?.color ?? '#f97316';

  const content = (
    <div
      onClick={onClickCard}
      className={`
        group py-2 px-1 flex flex-col items-center justify-start transition-all duration-300 hover:-translate-y-1 rounded-2xl relative h-full
        ${isDeceased ? "grayscale-[0.4] opacity-80" : ""}
        ${showAvatar ? "w-20 sm:w-24 md:w-28 bg-white/70 hover:shadow-xl" : "px-3"}
        
      `}
    >
      {isRingVisible && (
        <div
          className={`
            absolute top-[15%] -left-2.5 sm:-left-3.5 size-5 sm:size-6 rounded-full z-100 flex items-center justify-center text-[10px] sm:text-sm font-medium
            ${isKinWarning ? 'text-red-600' : hasSpouse ? 'text-emerald-600' : 'text-stone-500'}
            ${showAvatar ? (isKinWarning ? 'shadow-sm bg-red-50 border border-red-100' : hasSpouse ? 'shadow-sm bg-emerald-50 border border-emerald-100' : 'shadow-sm bg-white') : ''}
          `}
        >
          <span className="leading-none">💍</span>
        </div>
      )}
      {/* children count badge (hidden in final label design) */}
      {isPlusVisible && (
        <div
          className={`
            absolute top-[15%] -left-2.5 sm:-left-3.5 size-5 sm:size-6 rounded-full z-100 flex items-center justify-center text-[10px] sm:text-sm font-medium
            ${isKinWarning ? 'text-red-600' : hasSpouse ? 'text-emerald-600' : 'text-stone-500'}
            ${showAvatar ? (isKinWarning ? 'shadow-sm bg-red-50 border border-red-100' : hasSpouse ? 'shadow-sm bg-emerald-50 border border-emerald-100' : 'shadow-sm bg-white') : ''}
          `}
        >
          <span className="leading-none">+</span>
        </div>
      )}

      {/* diamond indicator: show only for kin-warning (red) */}
      {isKinWarning && (
        <div
          className={`absolute top-[12%] -right-3 size-4 sm:size-4 rounded-full z-100 flex items-center justify-center ${showAvatar ? 'bg-red-50 border border-red-100' : ''}`}
          title="Cảnh báo cận huyết"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-3.5 text-red-600"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2 4.5 9.5 12 22l7.5-12.5L12 2Zm0 3.4 4.7 4.7L12 18.2 7.3 10.1 12 5.4Z" />
          </svg>
        </div>
      )}

      {/* multiple disease ADN icons */}
      <div className="absolute top-0 left-0 flex gap-1 p-1">
        {assignedDiseases.slice(0, 6).map((d) => (
          <div key={d.id} title={d.name} className="w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px]" style={{ background: d.color ?? '#f97316' }}>
            <span className="leading-none">🧬</span>
          </div>
        ))}
        {assignedDiseases.length > 6 && (
          <div className="text-[10px] text-stone-700 bg-white/80 rounded px-1">+{assignedDiseases.length - 6}</div>
        )}
      </div>

      {/* genotype selector (when an active disease is selected and user wants to set genotype) */}
      {showGenotypeControls && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-0.5 z-[60] pointer-events-auto">
          {['AA', 'Aa', 'aa'].map((g) => {
            const current = activeDiseaseId
              ? getGenotypeForPerson(activeDiseaseId, person.id)
              : getPersonGenotype(person.id);
            const isActive = current === g;
            return (
              <button
                key={g}
                type="button"
                aria-pressed={isActive}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (activeDiseaseId) {
                    setGenotypeForPerson(activeDiseaseId, person.id, isActive ? null : g);
                  } else {
                    setPersonGenotype(person.id, isActive ? null : g);
                  }
                }}
                className={`min-w-[34px] px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium border shadow-sm transition-colors focus:outline-none flex flex-col items-center justify-center leading-none gap-0.5 ${isActive ? 'bg-sky-600 text-white border-sky-500 shadow' : 'bg-white/80 text-stone-700 hover:bg-white'}`}
                title={`Đặt genotype ${g}`}
              >
                <span>{g}</span>
                {showGenotypeProbabilities && genotypeProbabilities && (
                  <span className={`text-[9px] sm:text-[10px] ${isActive ? 'text-white/90' : 'text-stone-500'}`}>
                    {Math.round((genotypeProbabilities[g as keyof typeof genotypeProbabilities] ?? 0) * 100)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isDiseaseOrigin && (
        <div title="Nguồn bệnh" className={`absolute -top-2 right-0 text-white text-[10px] px-2 py-0.5 rounded-md shadow-sm ${person.gender === 'male' ? 'bg-sky-600' : 'bg-rose-600'}`}>
          Nguồn
        </div>
      )}

      {/* 1. Avatar */}
      {showAvatar && (
        <div className="relative z-10 mb-1.5 sm:mb-2">
          <div
            className={
              `
              h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center text-[10px] sm:text-xs md:text-sm text-white overflow-hidden shrink-0 shadow-lg ring-2 ring-white transition-transform duration-300 group-hover:scale-105
              ${getAvatarBg(person.gender)}
            `}
            style={undefined}
            onClick={(e) => {
              e.stopPropagation();
              // Shift+click: set this node as dashboard root (collapse/zoom to it)
              if ((e as any).shiftKey) {
                setRootId(person.id);
                if (currentView === "list") setView("tree");
              } else {
                // Plain click opens member modal
                setMemberModalId(person.id);
              }
            }}
          >
            {person.avatar_url ? (
              <Image
                unoptimized
                src={person.avatar_url}
                alt={person.full_name}
                className="w-full h-full object-cover"
                width={64}
                height={64}
              />
            ) : (
              <DefaultAvatar gender={person.gender} size={64} />
            )}
          </div>
        </div>
      )}

      {/* 2. Gender Icon + Name */}
      <div className="flex flex-col items-center justify-center gap-1 w-full px-0.5 sm:px-1 relative z-10">
        <div
          className={`
            text-[10px] sm:text-[11px] md:text-xs font-bold text-center leading-tight transition-colors cursor-pointer
            ${onClickName ? "text-stone-800 group-hover:text-amber-700 hover:underline" : "text-stone-800 group-hover:text-amber-800"}
          `}
          title={person.full_name}
          onClick={(e) => {
            if (onClickName) {
              e.stopPropagation();
              e.preventDefault();
              onClickName(e);
            }
          }}
        >
          {person.full_name}
        </div>
        {/* birth - death line beneath the name */}
        {(person.birth_year || person.death_year) && (
          <div className="text-[10px] text-stone-500 mt-0.5">
            {person.birth_year ?? ""}{(person.birth_year || person.death_year) ? ' - ' : ''}{person.death_year ?? ""}
          </div>
        )}
      </div>
    </div>
  );

  if (onClickCard || onClickName) {
    return content;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setMemberModalId(person.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setMemberModalId(person.id);
        }
      }}
      className="block w-fit"
    >
      {content}
    </div>
  );
}
