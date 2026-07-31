"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import FamilyTree from "@/components/tree/FamilyTree";
import { Icon } from "@/components/ui/Icon";
import { ProjectDatePicker } from "@/components/ui/ProjectDatePicker";
import { useApp } from "@/components/providers/AppProvider";
import { useDialog } from "@/components/providers/DialogProvider";
import type { AsyncResult } from "@/lib";
import type { Locale } from "@/lib/i18n";
import { useCase, useUpdateCase } from "@/hooks/use-cases";
import {
  useCreateFamilyMember,
  useDeleteFamilyMember,
  useFamilyTree,
  useUpdateFamilyMember,
} from "@/hooks/use-family-members";
import { useCalculateHeirs, useHeirs } from "@/hooks/use-heirs";
import { useGeneratePdf, useReports } from "@/hooks/use-reports";
import {
  CreateFamilyMemberDto,
  CreateEstatePropertyDto,
  EstateProperty,
  FamilyTreeMember,
  FamilyTreeNode,
  Gender,
  Heir,
  Language,
  RelationType,
  Report,
  UpdateFamilyMemberDto,
} from "@/types";
import {
  getGenderFromRelation,
  isDirectChildRelation,
  relationLabel,
  RELATION_GROUPS,
} from "@/utils/relation-map";
import { legalText } from "@/utils/legal-text";
import {
  formatDate,
  formatMoney,
  formatNumber,
  percentage,
} from "@/utils/format";
import { caseStatusLabel, languageLabel } from "@/utils/labels";

type Tab = "family" | "properties" | "results" | "reports";

type RelativeFormState = {
  id?: string;
  fullName: string;
  relationType: RelationType;
  gender: Gender;
  spouseId: string;
  isAlive: boolean;
  isMuslim: boolean;
  isMurderer: boolean;
  birthDate: string;
};

const defaultRelation = RelationType.WIFE;

function defaultRelativeForm(): RelativeFormState {
  return {
    fullName: "",
    relationType: defaultRelation,
    gender: getGenderFromRelation(defaultRelation),
    spouseId: "",
    isAlive: true,
    isMuslim: true,
    isMurderer: false,
    birthDate: "",
  };
}

function subscribe() {
  return () => {};
}
function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export default function CaseDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const caseId = params.id;
  const { t, locale } = useApp();
  const { confirm } = useDialog();
  const mounted = useIsClient();
  const [tab, setTab] = useState<Tab>("family");
  const [selectedNode, setSelectedNode] = useState<FamilyTreeNode | null>(null);
  const [form, setForm] = useState<RelativeFormState>(defaultRelativeForm);

  const caseQuery = useCase(caseId);
  const treeQuery = useFamilyTree(caseId);
  const heirsQuery = useHeirs(caseId);
  const reportsQuery = useReports(caseId);
  const { createMember, loading: creating } = useCreateFamilyMember();
  const { updateMember, loading: updating } = useUpdateFamilyMember(
    form.id ?? "",
  );
  const { deleteMember, loading: deleting } = useDeleteFamilyMember();
  const { calculate, loading: calculating } = useCalculateHeirs();
  const { generatePdf, loading: generatingPdf } = useGeneratePdf();
  const { updateCase, loading: savingProperties } = useUpdateCase(caseId);

  const inheritanceCase = caseQuery.data;
  const tree = treeQuery.data;
  const heirs = heirsQuery.data?.heirs ?? inheritanceCase?.heirs ?? [];
  const eligibleHeirs = heirs.filter((h) => h.isEligible);
  const blockedHeirs = heirs.filter((h) => !h.isEligible);
  const members =
    tree?.nodes
      .map((n) => n.member)
      .filter((m): m is FamilyTreeMember => Boolean(m)) ?? [];
  const spouses = members.filter(
    (m) =>
      m.relationType === RelationType.WIFE ||
      m.relationType === RelationType.HUSBAND,
  );

  const netEstate = useMemo(() => {
    if (!inheritanceCase) return 0;
    return Math.max(
      0,
      Number(inheritanceCase.totalEstate ?? 0) -
        Number(inheritanceCase.funeralCosts ?? 0) -
        Number(inheritanceCase.debts ?? 0) -
        Number(inheritanceCase.mandatoryWill ?? 0) -
        Number(inheritanceCase.optionalWill ?? 0),
    );
  }, [inheritanceCase]);

  const totalPropertyShares = useMemo(
    () =>
      (inheritanceCase?.properties ?? []).reduce(
        (total, property) => total + Number(property.totalShares ?? 0),
        0,
      ),
    [inheritanceCase],
  );

  function refetchAll() {
    caseQuery.refetch();
    treeQuery.refetch();
    heirsQuery.refetch();
    reportsQuery.refetch();
  }

  function selectRelation(relationType: RelationType) {
    setSelectedNode(null);
    setForm({
      ...defaultRelativeForm(),
      relationType,
      gender: getGenderFromRelation(relationType),
      spouseId:
        isDirectChildRelation(relationType) && spouses.length === 1
          ? spouses[0].id
          : "",
    });
  }

  function selectTreeNode(node: FamilyTreeNode) {
    if (!node.member) return;
    const member = node.member;
    setSelectedNode(node);
    setForm({
      id: member.id,
      fullName: member.fullName,
      relationType: member.relationType,
      gender: member.gender,
      spouseId: isDirectChildRelation(member.relationType)
        ? (member.parentId ?? "")
        : "",
      isAlive: member.isAlive,
      isMuslim: member.isMuslim,
      isMurderer: member.isMurderer,
      birthDate: member.birthDate ? member.birthDate.slice(0, 10) : "",
    });
  }

  async function submitRelative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: CreateFamilyMemberDto | UpdateFamilyMemberDto = {
      caseId,
      fullName: form.fullName,
      relationType: form.relationType,
      gender: form.gender,
      spouseId: isDirectChildRelation(form.relationType)
        ? form.spouseId || undefined
        : undefined,
      isAlive: form.isAlive,
      isMuslim: form.isMuslim,
      isMurderer: form.isMurderer,
      birthDate: form.birthDate || undefined,
    };
    try {
      if (form.id) {
        await updateMember(payload);
      } else {
        await createMember(payload as CreateFamilyMemberDto);
      }
      toast.success(t.relativeSaved);
      setForm(defaultRelativeForm());
      setSelectedNode(null);
      refetchAll();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.unableToSaveRelative,
      );
    }
  }

  async function handleDeleteMember() {
    if (!form.id) return;
    const approved = await confirm({
      title: t.deleteRelativeTitle,
      description: t.deleteThisRelative,
      confirmLabel: t.delete,
      cancelLabel: t.cancel,
      tone: "danger",
    });
    if (!approved) return;
    try {
      await deleteMember(form.id);
      toast.success(t.relativeDeleted);
      setForm(defaultRelativeForm());
      setSelectedNode(null);
      refetchAll();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.unableToDeleteRelative,
      );
    }
  }

  async function handleCalculate() {
    try {
      await calculate(caseId);
      toast.success(t.calculationDone);
      setTab("results");
      refetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.calculationFailed);
    }
  }

  async function handleGeneratePdf() {
    try {
      await generatePdf(caseId, locale === "ar" ? Language.AR : Language.EN);
      toast.success(t.reportReady);
      reportsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.reportFailed);
    }
  }

  if (caseQuery.loading) {
    return (
      <div className="cd-loading-screen">
        <div className="cd-loading-ring" />
        <p>{t.loading}</p>
        <style jsx global>{`
          .cd-loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 40vh;
            gap: 16px;
            font-family: "DM Mono", monospace;
            font-size: 13px;
            color: var(--muted);
          }
          .cd-loading-ring {
            width: 40px;
            height: 40px;
            border: 2px solid var(--border);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!inheritanceCase) {
    return (
      <div className="surface rounded-lg p-8">
        <p className="text-[var(--danger)]">
          {caseQuery.error ?? t.caseNotFound}
        </p>
        <button
          className="btn btn-secondary mt-4"
          onClick={() => router.push("/cases")}
        >
          {t.cases}
        </button>
      </div>
    );
  }

  const tabIcons: Record<Tab, string> = {
    family: "⬡",
    properties: "⌂",
    results: "◎",
    reports: "◈",
  };

  return (
    <div className="cd-root">
      {/* Ambient decoration */}
      <div className="cd-ambient" aria-hidden="true">
        <div className="cd-orb cd-orb--1" />
        <div className="cd-orb cd-orb--2" />
      </div>

      {/* ── Hero header ── */}
      <header className={`cd-hero ${mounted ? "cd-hero--in" : ""}`}>
        <div className="cd-hero-left">
          <div className="cd-hero-badges">
            <span
              className={`cd-status-pill cd-status-pill--${inheritanceCase.status.toLowerCase()}`}
            >
              <span className="cd-status-pip" />
              {caseStatusLabel(inheritanceCase.status, t)}
            </span>
            <span className="cd-date-pill">
              <span className="cd-date-icon">☪</span>{" "}
              {formatDate(inheritanceCase.deathDate, locale)}
            </span>
          </div>
          <h1 className="cd-hero-name">{inheritanceCase.deceasedName}</h1>
          <p className="cd-hero-hint">{t.treeHint}</p>
        </div>

        <div className="cd-hero-actions">
          <button
            className="cd-action-btn cd-action-btn--primary"
            onClick={handleCalculate}
            disabled={calculating || members.length === 0}
          >
            {calculating ? (
              <span className="cd-btn-spin" />
            ) : (
              <Icon name="calculator" />
            )}
            <span>{calculating ? t.loading : t.calculate}</span>
          </button>
          <button
            className="cd-action-btn cd-action-btn--ghost"
            onClick={handleGeneratePdf}
            disabled={generatingPdf || heirs.length === 0}
          >
            {generatingPdf ? (
              <span className="cd-btn-spin" />
            ) : (
              <Icon name="download" />
            )}
            <span>{generatingPdf ? t.loading : t.exportPdf}</span>
          </button>
        </div>
      </header>

      {/* ── Estate stats ── */}
      <div className={`cd-estate-grid ${mounted ? "cd-estate-grid--in" : ""}`}>
        {[
          {
            label: t.totalEstate,
            value: formatMoney(
              inheritanceCase.totalEstate,
              inheritanceCase.currency,
              locale,
            ),
            accent: false,
          },
          {
            label:
              locale === "ar" ? "إجمالي أسهم العقارات" : "Total property shares",
            value: `${formatNumber(totalPropertyShares)} ${
              locale === "ar" ? "سهم" : "shares"
            }`,
            accent: false,
          },
          {
            label: t.funeralCosts,
            value: formatMoney(
              inheritanceCase.funeralCosts,
              inheritanceCase.currency,
              locale,
            ),
            accent: false,
          },
          {
            label: t.debts,
            value: formatMoney(
              inheritanceCase.debts,
              inheritanceCase.currency,
              locale,
            ),
            accent: false,
          },
          {
            label: t.optionalWill,
            value: formatMoney(
              Number(inheritanceCase.optionalWill) +
                Number(inheritanceCase.mandatoryWill),
              inheritanceCase.currency,
              locale,
            ),
            accent: false,
          },
          {
            label: t.netEstate,
            value: formatMoney(netEstate, inheritanceCase.currency, locale),
            accent: true,
          },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`cd-estate-card ${s.accent ? "cd-estate-card--accent" : ""}`}
            style={{ "--card-i": i } as React.CSSProperties}
          >
            <span className="cd-estate-label">{s.label}</span>
            <span className="cd-estate-value">{s.value}</span>
            {s.accent && <div className="cd-estate-glow" />}
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className={`cd-tabbar no-print ${mounted ? "cd-tabbar--in" : ""}`}>
        {(["family", "properties", "results", "reports"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            className={`cd-tab ${tab === item ? "cd-tab--active" : ""}`}
            onClick={() => setTab(item)}
          >
            <span className="cd-tab-icon">{tabIcons[item]}</span>
            <span>
              {item === "family"
                ? t.family
                : item === "properties"
                  ? locale === "ar"
                    ? "العقارات"
                    : "Real estate"
                : item === "results"
                  ? t.results
                  : t.reports}
            </span>
            {tab === item && <span className="cd-tab-line" />}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className={`cd-content ${mounted ? "cd-content--in" : ""}`}>
        {tab === "family" && (
          <div className="cd-family-layout">
            <RelativePanel
              form={form}
              setForm={setForm}
              spouses={spouses}
              onRelationSelect={selectRelation}
              onSubmit={submitRelative}
              onDelete={handleDeleteMember}
              saving={creating || updating}
              deleting={deleting}
            />
            <div className="cd-tree-wrap">
              <div className="cd-tree-header">
                <div>
                  <h3 className="cd-section-title">{t.familyTree}</h3>
                  <p className="cd-section-sub">{t.automaticLayout}</p>
                </div>
                <span className="cd-member-count">
                  <span className="cd-member-count-num">
                    {formatNumber(members.length)}
                  </span>
                  <span className="cd-member-count-label">
                    {t.familyMembers}
                  </span>
                </span>
              </div>
              <FamilyTree
                tree={tree ?? null}
                selectedId={selectedNode?.id}
                onSelect={selectTreeNode}
                totalPropertyShares={totalPropertyShares}
              />
            </div>
          </div>
        )}

        {tab === "results" && (
          <ResultsSection
            eligibleHeirs={eligibleHeirs}
            blockedHeirs={blockedHeirs}
            currency={inheritanceCase.currency}
            properties={inheritanceCase.properties ?? []}
          />
        )}

        {tab === "properties" && (
          <PropertyEditor
            key={(inheritanceCase.properties ?? [])
              .map((property) => property.id)
              .join(":")}
            properties={inheritanceCase.properties ?? []}
            saving={savingProperties}
            onSave={async (properties) => {
              try {
                await updateCase({ properties });
                toast.success(
                  locale === "ar" ? "تم حفظ العقارات." : "Properties saved.",
                );
                caseQuery.refetch();
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : t.deleteFailed,
                );
              }
            }}
          />
        )}

        {tab === "reports" && (
          <ReportsSection
            reportsQuery={reportsQuery}
            generatingPdf={generatingPdf}
            heirs={heirs}
            onGenerate={handleGeneratePdf}
            locale={locale}
            deceasedName={inheritanceCase.deceasedName}
          />
        )}
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap");

        .cd-root {
          position: relative;
          padding: 0 0 3rem;
          font-family: "Syne", sans-serif;
        }

        /* Ambient orbs */
        .cd-ambient {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .cd-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.06;
        }
        .cd-orb--1 {
          width: 700px;
          height: 700px;
          background: var(--primary);
          top: -200px;
          right: -200px;
          animation: orb-drift 22s ease-in-out infinite;
        }
        .cd-orb--2 {
          width: 500px;
          height: 500px;
          background: #d4a373;
          bottom: 0;
          left: -100px;
          animation: orb-drift 28s ease-in-out infinite reverse 4s;
        }
        @keyframes orb-drift {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(30px, -40px);
          }
        }

        /* Hero */
        .cd-hero {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
          padding: 2rem 0 1.5rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 1.5rem;
          opacity: 0;
          transform: translateY(20px);
          transition:
            opacity 0.6s ease,
            transform 0.6s ease;
        }
        .cd-hero--in {
          opacity: 1;
          transform: translateY(0);
        }

        .cd-hero-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .cd-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .cd-status-pip {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }
        .cd-status-pill--draft {
          background: color-mix(in srgb, #f59e0b 14%, transparent);
          color: #f59e0b;
        }
        .cd-status-pill--calculated {
          background: color-mix(in srgb, #4ade80 14%, transparent);
          color: #15803d;
        }
        .dark .cd-status-pill--calculated {
          color: #4ade80;
        }
        .cd-status-pill--closed {
          background: color-mix(in srgb, var(--muted) 14%, transparent);
          color: var(--muted);
        }

        .cd-date-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          background: var(--surface);
          border: 1px solid var(--border);
          font-family: "DM Mono", monospace;
          font-size: 11px;
          color: var(--muted);
        }
        .cd-date-icon {
          font-size: 13px;
          opacity: 0.6;
        }

        .cd-hero-name {
          font-family: "Instrument Serif", Georgia, serif;
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 400;
          line-height: 1;
          letter-spacing: -0.03em;
          margin: 0 0 8px;
        }
        .cd-hero-hint {
          font-size: 13px;
          color: var(--muted);
          font-family: "DM Mono", monospace;
          margin: 0;
        }

        .cd-hero-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-self: center;
        }

        .cd-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          font-family: "Syne", sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          border: 1px solid transparent;
        }
        .cd-action-btn--primary {
          background: var(--primary);
          color: white;
          box-shadow: 0 8px 24px -8px
            color-mix(in srgb, var(--primary) 60%, transparent);
        }
        .dark .cd-action-btn--primary {
          color: #082f2c;
        }
        .cd-action-btn--primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 32px -10px
            color-mix(in srgb, var(--primary) 70%, transparent);
        }
        .cd-action-btn--ghost {
          background: var(--surface);
          border-color: var(--border);
          color: var(--text);
        }
        .cd-action-btn--ghost:hover:not(:disabled) {
          border-color: var(--primary);
          color: var(--primary);
          transform: translateY(-2px);
        }
        .cd-action-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .cd-btn-spin {
          display: block;
          width: 14px;
          height: 14px;
          border: 1.5px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Estate grid */
        .cd-estate-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 1.5rem;
          opacity: 0;
          transform: translateY(14px);
          transition:
            opacity 0.6s ease 0.1s,
            transform 0.6s ease 0.1s;
        }
        @media (min-width: 768px) {
          .cd-estate-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (min-width: 1280px) {
          .cd-estate-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }
        .cd-estate-grid--in {
          opacity: 1;
          transform: translateY(0);
        }

        .cd-estate-card {
          position: relative;
          overflow: hidden;
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
          animation: card-in 0.5s ease calc(var(--card-i) * 60ms) both;
        }
        @keyframes card-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .cd-estate-card:hover {
          transform: translateY(-2px);
        }
        .cd-estate-card--accent {
          background: color-mix(in srgb, var(--primary) 8%, var(--surface));
          border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
        }
        .cd-estate-label {
          display: block;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 8px;
        }
        .cd-estate-value {
          display: block;
          font-family: "DM Mono", monospace;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cd-estate-card--accent .cd-estate-value {
          color: var(--primary);
          font-size: 16px;
          font-weight: 700;
        }
        .cd-estate-glow {
          position: absolute;
          top: -20px;
          right: -20px;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--primary);
          opacity: 0.08;
          filter: blur(20px);
        }

        /* Tab bar */
        .cd-tabbar {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 4px;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
          opacity: 0;
          transform: translateY(10px);
          transition:
            opacity 0.5s ease 0.2s,
            transform 0.5s ease 0.2s;
        }
        .cd-tabbar--in {
          opacity: 1;
          transform: translateY(0);
        }

        .cd-tab {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: none;
          border: none;
          font-family: "Syne", sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: var(--muted);
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .cd-tab:hover {
          color: var(--text);
        }
        .cd-tab--active {
          color: var(--primary);
        }
        .cd-tab-icon {
          font-size: 14px;
          opacity: 0.7;
        }
        .cd-tab-line {
          position: absolute;
          bottom: -1px;
          inset-inline: 0;
          height: 2px;
          background: var(--primary);
          border-radius: 2px 2px 0 0;
          animation: tab-line-in 0.25s ease;
        }
        @keyframes tab-line-in {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        /* Content */
        .cd-content {
          position: relative;
          z-index: 1;
          opacity: 0;
          transform: translateY(12px);
          transition:
            opacity 0.5s ease 0.25s,
            transform 0.5s ease 0.25s;
        }
        .cd-content--in {
          opacity: 1;
          transform: translateY(0);
        }

        /* Family layout */
        .cd-family-layout {
          display: grid;
          gap: 1.5rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1280px) {
          .cd-family-layout {
            grid-template-columns: 360px 1fr;
          }
        }

        .cd-tree-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cd-tree-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cd-section-title {
          font-family: "Instrument Serif", Georgia, serif;
          font-size: 22px;
          font-weight: 400;
          letter-spacing: -0.02em;
          margin: 0 0 2px;
        }
        .cd-section-sub {
          font-size: 12px;
          color: var(--muted);
          font-family: "DM Mono", monospace;
          margin: 0;
        }
        .cd-member-count {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
        }
        .cd-member-count-num {
          font-family: "Instrument Serif", Georgia, serif;
          font-size: 28px;
          color: var(--primary);
          line-height: 1;
        }
        .cd-member-count-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
        }

        @media (max-width: 768px) {
          .cd-hero {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Relative Panel ── */
function RelativePanel({
  form,
  setForm,
  spouses,
  onRelationSelect,
  onSubmit,
  onDelete,
  saving,
  deleting,
}: {
  form: RelativeFormState;
  setForm: Dispatch<SetStateAction<RelativeFormState>>;
  spouses: FamilyTreeMember[];
  onRelationSelect: (relation: RelationType) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  const { t, locale } = useApp();
  const showSpouseSelect = isDirectChildRelation(form.relationType);

  return (
    <aside className="rp-panel">
      <div className="rp-header">
        <div>
          <div className="rp-eyebrow">
            <span aria-hidden="true">{form.id ? "◎" : "⬡"} </span>
            {form.id ? t.edit : t.new}
          </div>
          <h3 className="rp-title">
            {form.id ? t.editRelative : t.addRelative}
          </h3>
        </div>
        {form.id && (
          <button
            type="button"
            className="rp-cancel-btn"
            onClick={() => setForm(defaultRelativeForm())}
          >
            {t.cancel}
          </button>
        )}
      </div>

      {/* Relation selector */}
      <div className="rp-relations">
        {RELATION_GROUPS.map((group) => (
          <div key={group.title.en} className="rp-group">
            <p className="rp-group-title">{group.title[locale]}</p>
            <div className="rp-group-btns">
              {group.relations.map((relation) => (
                <button
                  key={relation}
                  type="button"
                  className={`rp-rel-btn ${form.relationType === relation ? "rp-rel-btn--active" : ""}`}
                  onClick={() => onRelationSelect(relation)}
                >
                  {relationLabel(relation, locale)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="rp-form">
        <label className="rp-field">
          <span className="rp-label">{t.fullName}</span>
          <input
            className="rp-input"
            value={form.fullName}
            onChange={(e) =>
              setForm((c) => ({ ...c, fullName: e.target.value }))
            }
            required
          />
        </label>

        <div className="rp-row">
          <label className="rp-field">
            <span className="rp-label">{t.relation}</span>
            <select
              className="rp-select"
              value={form.relationType}
              onChange={(e) => {
                const relationType = e.target.value as RelationType;
                setForm((c) => ({
                  ...c,
                  relationType,
                  gender: getGenderFromRelation(relationType),
                  spouseId: isDirectChildRelation(relationType)
                    ? c.spouseId
                    : "",
                }));
              }}
            >
              {RELATION_GROUPS.flatMap((g) => g.relations).map((r) => (
                <option key={r} value={r}>
                  {relationLabel(r, locale)}
                </option>
              ))}
            </select>
          </label>
          <label className="rp-field">
            <span className="rp-label">{t.gender}</span>
            <select
              className="rp-select"
              value={form.gender}
              onChange={(e) =>
                setForm((c) => ({ ...c, gender: e.target.value as Gender }))
              }
            >
              <option value={Gender.MALE}>{t.male}</option>
              <option value={Gender.FEMALE}>{t.female}</option>
            </select>
          </label>
        </div>

        {showSpouseSelect && (
          <label className="rp-field">
            <span className="rp-label">{t.spouseFamily}</span>
            <select
              className="rp-select"
              value={form.spouseId}
              onChange={(e) =>
                setForm((c) => ({ ...c, spouseId: e.target.value }))
              }
            >
              <option value="">{t.noSpouse}</option>
              {spouses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} - {relationLabel(s.relationType, locale)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="rp-field">
          <span className="rp-label">{t.birthDate}</span>
          <ProjectDatePicker
            label={t.birthDate}
            value={form.birthDate}
            onChange={(nextValue) =>
              setForm((c) => ({ ...c, birthDate: nextValue }))
            }
            locale={locale}
            variant="panel"
          />
        </label>

        <div className="rp-toggles">
          {(
            [
              { key: "isAlive", label: t.alive },
              { key: "isMuslim", label: t.muslim },
              { key: "isMurderer", label: t.murderer },
            ] as const
          ).map((tog) => (
            <label key={tog.key} className="rp-toggle">
              <span className="rp-toggle-label">{tog.label}</span>
              <div className="rp-toggle-track">
                <input
                  type="checkbox"
                  checked={form[tog.key]}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, [tog.key]: e.target.checked }))
                  }
                  className="rp-toggle-input"
                />
                <span className="rp-toggle-thumb" />
              </div>
            </label>
          ))}
        </div>

        <div className="rp-actions">
          <button className="rp-save-btn" disabled={saving} type="submit">
            {saving ? (
              <span className="rp-spin" />
            ) : (
              <Icon name="edit" size={14} />
            )}
            {saving ? t.loading : t.save}
          </button>
          {form.id && (
            <button
              className="rp-del-btn"
              disabled={deleting}
              onClick={onDelete}
              type="button"
            >
              {deleting ? (
                <span className="rp-spin" />
              ) : (
                <Icon name="trash" size={14} />
              )}
              {t.delete}
            </button>
          )}
        </div>
      </form>

      <style jsx global>{`
        .rp-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          font-family: "Syne", sans-serif;
        }
        .rp-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
          background: color-mix(
            in srgb,
            var(--surface-2, #eef1f4) 40%,
            var(--surface)
          );
        }
        .rp-eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 4px;
        }
        .rp-title {
          font-family: "Instrument Serif", Georgia, serif;
          font-size: 20px;
          font-weight: 400;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .rp-cancel-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--muted);
          font-family: "Syne", sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .rp-cancel-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .rp-relations {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 220px;
          overflow-y: auto;
        }
        .rp-relations::-webkit-scrollbar {
          width: 12px;
        }
        .rp-relations::-webkit-scrollbar-track {
          border-radius: 999px;
          background: color-mix(in srgb, var(--surface-2) 78%, var(--bg));
        }
        .rp-relations::-webkit-scrollbar-thumb {
          border: 3px solid transparent;
          border-radius: 999px;
          background: linear-gradient(
              180deg,
              color-mix(in srgb, var(--primary-2) 72%, white),
              var(--primary)
            )
            padding-box;
          background-clip: padding-box;
        }

        .rp-group-title {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--muted);
          margin: 0 0 6px;
        }
        .rp-group-btns {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .rp-rel-btn {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text);
          font-family: "Syne", sans-serif;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .rp-rel-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .rp-rel-btn--active {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }
        .dark .rp-rel-btn--active {
          color: #082f2c;
        }

        .rp-form {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .rp-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .rp-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .rp-input,
        .rp-select {
          width: 100%;
          height: 38px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text);
          padding: 0 10px;
          font-family: "DM Mono", monospace;
          font-size: 13px;
          outline: none;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }
        .rp-input:focus,
        .rp-select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--primary) 15%, transparent);
        }
        .rp-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .rp-toggles {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .rp-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          border-radius: 10px;
          background: color-mix(
            in srgb,
            var(--surface-2, #eef1f4) 50%,
            var(--surface)
          );
          border: 1px solid var(--border);
          cursor: pointer;
        }
        .rp-toggle-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text);
        }
        .rp-toggle-track {
          position: relative;
          width: 30px;
          height: 16px;
          border-radius: 999px;
          background: var(--border);
          transition: background 0.2s ease;
          flex-shrink: 0;
        }
        .rp-toggle-input {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
          margin: 0;
        }
        .rp-toggle-input:checked ~ .rp-toggle-thumb {
          transform: translateX(14px);
        }
        [dir="rtl"] .rp-toggle-input:checked ~ .rp-toggle-thumb {
          transform: translateX(-14px);
        }
        .rp-toggle-input:checked + .rp-toggle-thumb {
          background: var(--primary);
        }
        .rp-toggle:has(input:checked) .rp-toggle-track {
          background: color-mix(in srgb, var(--primary) 30%, var(--border));
        }
        .rp-toggle-thumb {
          position: absolute;
          top: 2px;
          inset-inline-start: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--muted);
          pointer-events: none;
          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }
        .rp-toggle:has(input:checked) .rp-toggle-thumb {
          transform: translateX(14px);
          background: var(--primary);
        }
        [dir="rtl"] .rp-toggle:has(input:checked) .rp-toggle-thumb {
          transform: translateX(-14px);
        }

        .rp-actions {
          display: flex;
          gap: 8px;
          padding-top: 4px;
        }
        .rp-save-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border-radius: 10px;
          border: none;
          background: var(--primary);
          color: white;
          font-family: "Syne", sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dark .rp-save-btn {
          color: #082f2c;
        }
        .rp-save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px -6px
            color-mix(in srgb, var(--primary) 60%, transparent);
        }
        .rp-save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .rp-del-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--border));
          background: color-mix(in srgb, var(--danger) 8%, transparent);
          color: var(--danger);
          font-family: "Syne", sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .rp-del-btn:hover:not(:disabled) {
          background: var(--danger);
          color: white;
          border-color: var(--danger);
        }
        .rp-del-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .rp-spin {
          display: block;
          width: 12px;
          height: 12px;
          border: 1.5px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </aside>
  );
}

function PropertyEditor({
  properties,
  saving,
  onSave,
}: {
  properties: EstateProperty[];
  saving: boolean;
  onSave: (properties: CreateEstatePropertyDto[]) => Promise<void>;
}) {
  const { locale, t } = useApp();
  const labels =
    locale === "ar"
      ? {
          title: "إدارة العقارات",
          hint: "أضف العقارات ليتم توزيع ملكية كل عقار كأسهم بين الورثة.",
          add: "إضافة عقار",
          remove: "حذف",
          propertyName: "اسم العقار",
          description: "الوصف أو بيانات السجل",
          value: "عدد الأسهم",
        }
      : {
          title: "Manage real estate",
          hint: "Add properties to divide each property's ownership into shares among the heirs.",
          add: "Add property",
          remove: "Remove",
          propertyName: "Property name",
          description: "Description or registry details",
          value: "Total shares",
        };
  const [items, setItems] = useState(
    properties.map((property) => ({
      name: property.name,
      description: property.description ?? "",
      totalShares: String(property.totalShares ?? 2400),
    })),
  );

  return (
    <section className="pe-panel">
      <div className="pe-header">
        <div>
          <h3>{labels.title}</h3>
          <p>{labels.hint}</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            setItems((current) => [
              ...current,
              { name: "", description: "", totalShares: "2400" },
            ])
          }
        >
          + {labels.add}
        </button>
      </div>
      <div className="pe-list">
        {items.map((item, index) => (
          <div className="pe-card" key={index}>
            <input
              className="input"
              aria-label={labels.propertyName}
              placeholder={labels.propertyName}
              value={item.name}
              onChange={(event) =>
                setItems((current) =>
                  current.map((property, itemIndex) =>
                    itemIndex === index
                      ? { ...property, name: event.target.value }
                      : property,
                  ),
                )
              }
            />
            <input
              className="input"
              aria-label={labels.description}
              placeholder={labels.description}
              value={item.description}
              onChange={(event) =>
                setItems((current) =>
                  current.map((property, itemIndex) =>
                    itemIndex === index
                      ? { ...property, description: event.target.value }
                      : property,
                  ),
                )
              }
            />
            <div className="pe-value">
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                aria-label={labels.value}
                placeholder={labels.value}
                value={item.totalShares}
                onChange={(event) =>
                  setItems((current) =>
                    current.map((property, itemIndex) =>
                      itemIndex === index
                        ? { ...property, totalShares: event.target.value }
                        : property,
                    ),
                  )
                }
              />
              <span>{locale === "ar" ? "سهم" : "shares"}</span>
            </div>
            <button
              type="button"
              className="pe-remove"
              onClick={() =>
                setItems((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              {labels.remove}
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary pe-save"
        disabled={saving}
        onClick={() =>
          onSave(
            items
              .filter((item) => item.name.trim())
              .map((item) => ({
                name: item.name.trim(),
                description: item.description.trim() || undefined,
                totalShares: Number(item.totalShares || 2400),
              })),
          )
        }
      >
        {saving ? t.loading : t.save}
      </button>
      <style jsx global>{`
        .pe-panel { display: grid; gap: 18px; padding: 22px; border: 1px solid var(--border); border-radius: 18px; background: var(--surface); }
        .pe-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .pe-header h3 { margin: 0 0 6px; font-size: 19px; }
        .pe-header p { margin: 0; color: var(--muted); font-size: 12px; }
        .pe-list { display: grid; gap: 10px; }
        .pe-card { display: grid; grid-template-columns: 1fr 1.3fr 0.8fr auto; gap: 10px; align-items: center; padding: 12px; border: 1px solid var(--border); border-radius: 12px; }
        .pe-value { position: relative; }
        .pe-value .input { padding-inline-end: 48px; }
        .pe-value span { position: absolute; inset-inline-end: 10px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 10px; }
        .pe-remove { border: 0; background: transparent; color: var(--danger); cursor: pointer; font: inherit; font-size: 11px; }
        .pe-save { justify-self: end; }
        @media (max-width: 800px) { .pe-card { grid-template-columns: 1fr; } .pe-header { flex-direction: column; } }
      `}</style>
    </section>
  );
}

/* ── Results Section ── */
function ResultsSection({
  eligibleHeirs,
  blockedHeirs,
  currency,
  properties,
}: {
  eligibleHeirs: Heir[];
  blockedHeirs: Heir[];
  currency: string;
  properties: EstateProperty[];
}) {
  const { t, locale } = useApp();
  const propertyText =
    locale === "ar"
      ? {
          title: "أسهم ملكية العقارات",
          hint: "يُقسّم كل عقار بين الورثة المستحقين وفق الكسر الشرعي المحسوب.",
          total: "إجمالي أسهم العقار",
          unit: "سهم",
        }
      : {
          title: "Property ownership shares",
          hint: "Each property is divided among eligible heirs using the calculated inheritance fraction.",
          total: "Total property shares",
          unit: "shares",
        };

  if (!eligibleHeirs.length && !blockedHeirs.length) {
    return (
      <div className="rs-empty">
        <div className="rs-empty-glyph">◎</div>
        <p>{t.noResults}</p>
        <style jsx global>{`
          .rs-empty {
            text-align: center;
            padding: 60px 20px;
            font-family: "DM Mono", monospace;
            color: var(--muted);
            font-size: 13px;
          }
          .rs-empty-glyph {
            font-size: 48px;
            opacity: 0.15;
            margin-bottom: 12px;
            font-family: "Instrument Serif", serif;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="rs-layout">
      {/* Eligible */}
      <section className="rs-panel">
        <div className="rs-panel-header">
          <div className="rs-panel-icon rs-panel-icon--green">✓</div>
          <div>
            <h3 className="rs-panel-title">{t.eligibleHeirs}</h3>
            <p className="rs-panel-count">
              {formatNumber(eligibleHeirs.length)} {t.heirs}
            </p>
          </div>
        </div>
        <div className="rs-table-wrap">
          <table className="rs-table">
            <thead>
              <tr>
                {[t.name, t.relation, t.share, t.percentage, t.amount].map(
                  (h) => (
                    <th key={h} className="rs-th">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {eligibleHeirs.map((heir, i) => (
                <tr
                  key={heir.id}
                  className="rs-tr"
                  style={{ "--ri": i } as React.CSSProperties}
                >
                  <td className="rs-td rs-td--name">{heir.member.fullName}</td>
                  <td className="rs-td rs-td--muted">
                    {relationLabel(heir.member.relationType, locale)}
                  </td>
                  <td className="rs-td rs-td--fraction">
                    {heir.shareFraction ?? "0"}
                  </td>
                  <td className="rs-td">
                    <div className="rs-pct-wrap">
                      <div
                        className="rs-pct-bar"
                        style={
                          {
                            "--pct": heir.sharePercentage ?? 0,
                          } as React.CSSProperties
                        }
                      />
                      <span>{percentage(heir.sharePercentage)}</span>
                    </div>
                  </td>
                  <td className="rs-td rs-td--mono">
                    {formatMoney(heir.monetaryValue, currency, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {properties.length > 0 && (
        <section className="rs-panel rs-properties-panel">
          <div className="rs-panel-header">
            <div className="rs-panel-icon rs-panel-icon--property">⌂</div>
            <div>
              <h3 className="rs-panel-title">{propertyText.title}</h3>
              <p className="rs-panel-count">{propertyText.hint}</p>
            </div>
          </div>
          <div className="rs-properties-list">
            {properties.map((property) => (
              <article className="rs-property-card" key={property.id}>
                <div className="rs-property-heading">
                  <div>
                    <h4>{property.name}</h4>
                    {property.description && <p>{property.description}</p>}
                  </div>
                  <span className="rs-property-value">
                    {propertyText.total}: {formatNumber(property.totalShares)} {propertyText.unit}
                  </span>
                </div>
                <div className="rs-property-shares">
                  {eligibleHeirs.map((heir) => (
                    <div className="rs-property-share" key={heir.id}>
                      <span className="rs-property-heir">{heir.member.fullName}</span>
                      <strong>{heir.shareFraction ?? "0"}</strong>
                      <span>{percentage(heir.sharePercentage)}</span>
                      <small>
                        {new Intl.NumberFormat("en-US-u-nu-latn", {
                          maximumFractionDigits: 4,
                        }).format(
                          Number(property.totalShares) *
                            (Number(heir.sharePercentage ?? 0) / 100),
                        )}{" "}
                        {propertyText.unit}
                      </small>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Blocked */}
      <section className="rs-panel rs-panel--blocked">
        <div className="rs-panel-header">
          <div className="rs-panel-icon rs-panel-icon--red">✕</div>
          <div>
            <h3 className="rs-panel-title">{t.blockedHeirs}</h3>
            <p className="rs-panel-count">
              {formatNumber(blockedHeirs.length)} {t.heirs}
            </p>
          </div>
        </div>
        {blockedHeirs.length === 0 ? (
          <div className="rs-none">{t.noneBlocked}</div>
        ) : (
          <div className="rs-blocked-list">
            {blockedHeirs.map((heir) => (
              <div key={heir.id} className="rs-blocked-item">
                <div className="rs-blocked-top">
                  <span className="rs-blocked-name">
                    {heir.member.fullName}
                  </span>
                  <span className="rs-blocked-relation">
                    {relationLabel(heir.member.relationType, locale)}
                  </span>
                </div>
                <p className="rs-blocked-basis">
                  {legalText(heir.legalBasis, locale)}
                </p>
                {heir.blockedBy?.map((block) => (
                  <p key={block.id} className="rs-blocked-by">
                    <span aria-hidden="true">
                      {locale === "ar" ? "→" : "←"}
                    </span>{" "}
                    {t.blockedBy}: {block.blockedBy.member.fullName}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap");

        .rs-layout {
          display: grid;
          gap: 1.5rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1280px) {
          .rs-layout {
            grid-template-columns: 1fr 0.65fr;
          }
        }

        .rs-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
          font-family: "Syne", sans-serif;
        }
        .rs-properties-panel { grid-column: 1 / -1; }
        .rs-panel-icon--property { color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
        .rs-properties-list { display: grid; gap: 14px; padding: 18px; }
        .rs-property-card { border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
        .rs-property-heading { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
        .rs-property-heading h4 { margin: 0; font-size: 16px; }
        .rs-property-heading p { margin: 5px 0 0; color: var(--muted); font-size: 12px; }
        .rs-property-value { font-family: "DM Mono", monospace; font-size: 11px; color: var(--primary); }
        .rs-property-shares { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
        .rs-property-share { display: grid; grid-template-columns: 1fr auto; gap: 3px 10px; padding: 10px 12px; border-radius: 10px; background: var(--surface-2, #eef1f4); font-size: 12px; }
        .rs-property-share strong { color: var(--primary); font-family: "DM Mono", monospace; }
        .rs-property-share > span:not(.rs-property-heir), .rs-property-share small { color: var(--muted); font-family: "DM Mono", monospace; }
        .rs-panel-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          border-bottom: 1px solid var(--border);
          background: color-mix(
            in srgb,
            var(--surface-2, #eef1f4) 40%,
            var(--surface)
          );
        }
        .rs-panel-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .rs-panel-icon--green {
          background: color-mix(in srgb, #4ade80 15%, transparent);
          color: #15803d;
        }
        .dark .rs-panel-icon--green {
          color: #4ade80;
        }
        .rs-panel-icon--red {
          background: color-mix(in srgb, var(--danger) 12%, transparent);
          color: var(--danger);
        }
        .rs-panel-title {
          font-family: "Instrument Serif", Georgia, serif;
          font-size: 18px;
          font-weight: 400;
          margin: 0 0 2px;
        }
        .rs-panel-count {
          font-family: "DM Mono", monospace;
          font-size: 11px;
          color: var(--muted);
          margin: 0;
        }

        .rs-table-wrap {
          overflow-x: auto;
        }
        .rs-table {
          width: 100%;
          border-collapse: collapse;
        }
        .rs-th {
          padding: 12px 16px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--muted);
          text-align: start;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .rs-tr {
          border-bottom: 1px solid
            color-mix(in srgb, var(--border) 50%, transparent);
          animation: row-in 0.4s ease calc(var(--ri) * 40ms) both;
          transition: background 0.2s ease;
        }
        @keyframes row-in {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        [dir="rtl"] .rs-tr {
          animation-name: row-in-rtl;
        }
        [dir="rtl"] .rs-blocked-item {
          animation-name: row-in-rtl;
        }
        @keyframes row-in-rtl {
          from {
            opacity: 0;
            transform: translateX(8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .rs-tr:hover {
          background: color-mix(in srgb, var(--primary) 4%, transparent);
        }
        .rs-tr:last-child {
          border-bottom: none;
        }
        .rs-td {
          padding: 13px 16px;
          font-size: 13px;
          color: var(--text);
          white-space: nowrap;
        }
        .rs-td--name {
          font-weight: 700;
        }
        .rs-td--muted {
          color: var(--muted);
          font-size: 12px;
        }
        .rs-td--fraction {
          font-family: "DM Mono", monospace;
          font-weight: 700;
          color: var(--primary);
        }
        .rs-td--mono {
          font-family: "DM Mono", monospace;
          font-size: 12px;
        }

        .rs-pct-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rs-pct-bar {
          width: 48px;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          overflow: hidden;
          position: relative;
          flex-shrink: 0;
        }
        .rs-pct-bar::after {
          content: "";
          position: absolute;
          top: 0;
          inset-inline-start: 0;
          height: 100%;
          width: calc(var(--pct) * 1%);
          background: var(--primary);
          border-radius: 2px;
          animation: bar-fill 0.8s ease;
        }
        @keyframes bar-fill {
          from {
            width: 0;
          }
        }

        .rs-none {
          padding: 24px 20px;
          color: var(--muted);
          font-family: "DM Mono", monospace;
          font-size: 12px;
        }
        .rs-blocked-list {
          display: flex;
          flex-direction: column;
        }
        .rs-blocked-item {
          padding: 14px 20px;
          border-bottom: 1px solid
            color-mix(in srgb, var(--border) 50%, transparent);
          animation: row-in 0.4s ease both;
        }
        .rs-blocked-item:last-child {
          border-bottom: none;
        }
        .rs-blocked-top {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 4px;
        }
        .rs-blocked-name {
          font-weight: 700;
          font-size: 14px;
        }
        .rs-blocked-relation {
          font-size: 11px;
          color: var(--muted);
          font-family: "DM Mono", monospace;
        }
        .rs-blocked-basis {
          font-size: 12px;
          color: var(--text);
          margin: 0 0 4px;
          line-height: 1.5;
        }
        .rs-blocked-by {
          font-size: 11px;
          color: var(--danger);
          margin: 2px 0 0;
          font-family: "DM Mono", monospace;
        }
      `}</style>
    </div>
  );
}

/* ── Reports Section ── */
function ReportsSection({
  reportsQuery,
  generatingPdf,
  heirs,
  onGenerate,
  locale,
  deceasedName,
}: {
  reportsQuery: AsyncResult<Report[]>;
  generatingPdf: boolean;
  heirs: Heir[];
  onGenerate: () => void;
  locale: Locale;
  deceasedName: string;
}) {
  const { t } = useApp();
  const reportPrefix = locale === "ar" ? "تقرير ميراث" : "Inheritance Report";
  const displayName = deceasedName.trim()
    ? `${reportPrefix} ${deceasedName}.pdf`
    : `${reportPrefix}.pdf`;

  return (
    <section className="rep-panel">
      <div className="rep-header">
        <div>
          <div className="rep-eyebrow">
            <span aria-hidden="true">◈</span> {t.documents}
          </div>
          <h3 className="rep-title">{t.previousReports}</h3>
          <p className="rep-sub">{t.generateReport}</p>
        </div>
        <button
          className="rep-gen-btn"
          onClick={onGenerate}
          disabled={generatingPdf || heirs.length === 0}
        >
          {generatingPdf ? <span className="rep-spin" /> : <Icon name="file" />}
          {t.generateReport}
        </button>
      </div>

      {!reportsQuery.data?.length ? (
        <div className="rep-empty">
          <div className="rep-empty-icon">◈</div>
          <p>{t.noReports}</p>
        </div>
      ) : (
        <div className="rep-list">
          {reportsQuery.data.map((report, i) => (
            <div
              key={report.id}
              className="rep-item"
              style={{ "--ri": i } as React.CSSProperties}
            >
              <div className="rep-item-icon">{t.pdf}</div>
              <div className="rep-item-info">
                <p className="rep-item-name">
                  {displayName}
                </p>
                <p className="rep-item-meta">
                  {languageLabel(report.language, t)} ·{" "}
                  {formatDate(report.createdAt, locale)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap");

        .rep-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
          font-family: "Syne", sans-serif;
        }
        .rep-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          background: color-mix(
            in srgb,
            var(--surface-2, #eef1f4) 40%,
            var(--surface)
          );
          flex-wrap: wrap;
        }
        .rep-eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 4px;
        }
        .rep-title {
          font-family: "Instrument Serif", Georgia, serif;
          font-size: 22px;
          font-weight: 400;
          margin: 0 0 4px;
        }
        .rep-sub {
          font-size: 12px;
          color: var(--muted);
          margin: 0;
          font-family: "DM Mono", monospace;
        }
        .rep-gen-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          background: var(--primary);
          color: white;
          font-family: "Syne", sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          align-self: center;
        }
        .dark .rep-gen-btn {
          color: #082f2c;
        }
        .rep-gen-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px -6px
            color-mix(in srgb, var(--primary) 60%, transparent);
        }
        .rep-gen-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .rep-spin {
          display: block;
          width: 12px;
          height: 12px;
          border: 1.5px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .rep-empty {
          padding: 60px 24px;
          text-align: center;
          font-family: "DM Mono", monospace;
          color: var(--muted);
          font-size: 13px;
        }
        .rep-empty-icon {
          font-size: 40px;
          opacity: 0.15;
          margin-bottom: 12px;
        }

        .rep-list {
          padding: 8px 0;
        }
        .rep-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 24px;
          border-bottom: 1px solid
            color-mix(in srgb, var(--border) 50%, transparent);
          animation: rep-in 0.4s ease calc(var(--ri) * 50ms) both;
          transition: background 0.2s ease;
        }
        @keyframes rep-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .rep-item:last-child {
          border-bottom: none;
        }
        .rep-item:hover {
          background: color-mix(in srgb, var(--primary) 4%, transparent);
        }
        .rep-item-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          flex-shrink: 0;
          background: color-mix(in srgb, var(--danger) 12%, transparent);
          color: var(--danger);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          font-family: "DM Mono", monospace;
        }
        .rep-item-name {
          font-weight: 700;
          font-size: 13px;
          margin: 0 0 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 320px;
        }
        .rep-item-meta {
          font-family: "DM Mono", monospace;
          font-size: 11px;
          color: var(--muted);
          margin: 0;
        }
      `}</style>
    </section>
  );
}
