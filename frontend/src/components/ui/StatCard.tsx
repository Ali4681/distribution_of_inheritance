import { Icon, IconName } from "./Icon";
import { formatNumber } from "@/utils/format";

export default function StatCard({
  label,
  value,
  icon = "cases",
  suffix = "",
}: {
  label: string;
  value: number;
  icon?: IconName;
  suffix?: string;
}) {
  return (
    <div className="stat">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
        <Icon name={icon} />
      </div>
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black">
        {formatNumber(value)}
        {suffix ? <span className="text-sm text-[var(--muted)]"> {suffix}</span> : null}
      </p>
    </div>
  );
}
