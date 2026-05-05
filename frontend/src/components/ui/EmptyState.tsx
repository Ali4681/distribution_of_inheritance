import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-soft rounded-lg p-8 text-center">
      <p className="font-extrabold">{title}</p>
      {description ? (
        <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
