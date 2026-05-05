"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  NodeTypes,
  Position,
  ReactFlow,
} from "@xyflow/react";
import type { FamilyTreeNode, FamilyTreeResponse } from "@/types";
import { useApp } from "@/components/providers/AppProvider";
import { buildFlowTree, TreeFlowNodeData } from "@/utils/tree-layout";
import { relationLabel, relationTone } from "@/utils/relation-map";
import { formatMoney, percentage } from "@/utils/format";

const nodeTypes = {
  deceasedTreeNode: DeceasedTreeNode,
  memberTreeNode: MemberTreeNode,
  familyUnionNode: FamilyUnionNode,
} as NodeTypes;

export default function FamilyTree({
  tree,
  selectedId,
  onSelect,
}: {
  tree: FamilyTreeResponse | null;
  selectedId?: string;
  onSelect?: (node: FamilyTreeNode) => void;
}) {
  const { t, locale } = useApp();
  const flow = useMemo(() => {
    if (!tree) return { nodes: [], edges: [] };
    return buildFlowTree(tree, locale, selectedId);
  }, [locale, selectedId, tree]);

  if (!tree || tree.nodes.length <= 1) {
    return (
      <div className="tree-canvas flex h-[520px] items-center justify-center">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
            <span className="text-lg font-black">T</span>
          </div>
          <p className="font-bold">{t.emptyTree}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{t.treeHint}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tree-canvas h-[620px]">
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.18 }}
        onNodeClick={(_, node) => onSelect?.(node.data.treeNode)}
      >
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
      </ReactFlow>
    </div>
  );
}

function DeceasedTreeNode({ data }: { data: TreeFlowNodeData }) {
  const { t } = useApp();

  return (
    <div
      className={`tree-node tree-node-deceased ${data.selected ? "ring-2 ring-[var(--primary)]" : ""}`}
    >
      <TreeHandles />
      <div className="tree-node-header bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]">
        <span className="text-xs font-black uppercase tracking-wide text-[var(--primary)]">
          {t.deceased}
        </span>
      </div>
      <div className="tree-node-body">
        <p className="text-base font-black">{data.treeNode.label}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{t.caseCenter}</p>
      </div>
    </div>
  );
}

function FamilyUnionNode() {
  return (
    <div className="tree-node tree-node-union">
      <TreeHandles />
    </div>
  );
}

function MemberTreeNode({ data }: { data: TreeFlowNodeData }) {
  const { t } = useApp();
  const { treeNode, locale, selected } = data;
  const member = treeNode.member;
  const tone = relationTone(treeNode.relationType);
  const heir = member?.heir;
  const statusText = heir
    ? heir.isEligible
      ? t.eligible
      : t.blocked
    : member?.isAlive
      ? t.relativeAlive
      : t.relativeDeceased;

  return (
    <div className={`tree-node tone-${tone} ${selected ? "ring-2 ring-[var(--primary)]" : ""}`}>
      <TreeHandles />
      <div className="tree-node-header">
        <span className="truncate text-sm font-black">{treeNode.label}</span>
        <span
          className={`badge ${
            heir?.isEligible
              ? "badge-calculated"
              : heir
                ? "badge-draft"
                : "badge-closed"
          }`}
        >
          {statusText}
        </span>
      </div>
      <div className="tree-node-body">
        <p className="text-xs font-bold text-[var(--muted)]">
          {treeNode.relationType
            ? relationLabel(treeNode.relationType, locale)
            : "-"}
        </p>
        {heir ? (
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[var(--muted)]">{t.share}</p>
              <p className="font-black">{heir.shareFraction ?? "0"}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">{t.amount}</p>
              <p className="font-black">
                {formatMoney(heir.monetaryValue, "", locale)}
              </p>
            </div>
            <div className="col-span-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{
                    width: `${Math.min(
                      100,
                      Number(heir.sharePercentage ?? 0),
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[var(--muted)]">
                {percentage(heir.sharePercentage)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--muted)]">
            {treeNode.gender === "MALE"
              ? t.male
              : treeNode.gender === "FEMALE"
                ? t.female
                : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function TreeHandles() {
  return (
    <>
      <Handle
        className="tree-handle"
        isConnectable={false}
        position={Position.Top}
        type="target"
      />
      <Handle
        className="tree-handle"
        isConnectable={false}
        position={Position.Bottom}
        type="source"
      />
      <Handle
        className="tree-handle"
        id="left"
        isConnectable={false}
        position={Position.Left}
        type="source"
      />
      <Handle
        className="tree-handle"
        id="right"
        isConnectable={false}
        position={Position.Right}
        type="target"
      />
    </>
  );
}
