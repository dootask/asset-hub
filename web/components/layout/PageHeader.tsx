import { type ReactNode } from "react";
import PageBreadcrumb, {
  type BreadcrumbItemConfig,
} from "@/components/layout/PageBreadcrumb";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  locale: string;
  items: BreadcrumbItemConfig[];
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  actionsClassName?: string;
};

export default function PageHeader({
  locale,
  items,
  title,
  description,
  actions,
  className,
  actionsClassName,
}: PageHeaderProps) {
  return (
    <header className={className}>
      <PageBreadcrumb locale={locale} items={items} />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 md:justify-end",
              actionsClassName,
            )}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}


