import Link from "next/link";

type BreadcrumbItem = {
  href?: string;
  labelZh: string;
  labelEn: string;
};

type Props = {
  locale: string;
  items: BreadcrumbItem[];
};

export default function PageBreadcrumb({ locale, items }: Props) {
  const isChinese = locale === "zh";

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const label = isChinese ? item.labelZh : item.labelEn;
        const key = `${label}-${index}`;

        return (
          <span key={key} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-foreground"
              >
                {label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-foreground" : undefined}>
                {label}
              </span>
            )}
            {!isLast && <span className="text-muted-foreground/60">/</span>}
          </span>
        );
      })}
    </nav>
  );
}


