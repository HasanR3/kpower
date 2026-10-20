import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHero({
  kicker,
  title,
  subtitle,
  actions,
  Icon,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  Icon?: LucideIcon;
}) {
  return (
    <header className="page-hero">
      <div className="page-hero__copy">
        <p className="overview-kicker">
          {Icon ? <Icon aria-hidden size={12} strokeWidth={2.25} /> : null}
          {kicker}
        </p>
        <h1>{title}</h1>
        <p className="overview-sub">{subtitle}</p>
      </div>
      {actions ? <div className="page-hero__actions">{actions}</div> : null}
    </header>
  );
}
