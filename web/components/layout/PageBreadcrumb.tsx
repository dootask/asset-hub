import { Fragment } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type BreadcrumbItemConfig = {
  href?: string;
  labelZh: string;
  labelEn: string;
};

type Props = {
  locale: string;
  items: BreadcrumbItemConfig[];
};

const HOME_ITEM = {
  labelZh: "首页",
  labelEn: "Dashboard",
};

export default function PageBreadcrumb({ locale, items }: Props) {
  const isChinese = locale === "zh";

  const hasHome =
    items[0]?.labelZh === HOME_ITEM.labelZh &&
    items[0]?.labelEn === HOME_ITEM.labelEn;

  const normalizedItems = hasHome
    ? items
    : [
        {
          ...HOME_ITEM,
          href: `/${locale}`,
        },
        ...items,
      ];

  if (!normalizedItems.length) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {normalizedItems.map((item, index) => {
          const isLast = index === normalizedItems.length - 1;
          const label = isChinese ? item.labelZh : item.labelEn;

          return (
            <Fragment key={`${label}-${index}`}>
              <BreadcrumbItem>
                {item.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

