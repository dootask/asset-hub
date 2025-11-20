import Link from "next/link";
import { type ReactNode } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ListPaginationProps = {
  currentPage: number;
  totalPages: number;
  getHref: (page: number) => string;
  locale?: string;
  className?: string;
};

export default function ListPagination({
  currentPage,
  totalPages,
  getHref,
  locale = "en",
  className,
}: ListPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const isChinese = locale === "zh";

  const createPageRange = () => {
    const pages = new Set<number>();

    pages.add(1);
    pages.add(totalPages);
    pages.add(currentPage);
    pages.add(currentPage - 1);
    pages.add(currentPage + 1);

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  };

  const pages = createPageRange();

  const renderLink = (page: number, isActive = false) => {
    const href = getHref(page);
    return (
      <PaginationItem key={`page-${page}`}>
        <Link
          href={href}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            buttonVariants({
              variant: isActive ? "outline" : "ghost",
              size: "icon",
            }),
            "min-w-9 px-0 text-xs sm:text-sm",
          )}
        >
          {page}
        </Link>
      </PaginationItem>
    );
  };

  const renderControl = (type: "prev" | "next") => {
    const isPrev = type === "prev";
    const target = isPrev ? currentPage - 1 : currentPage + 1;
    const disabled = isPrev ? currentPage <= 1 : currentPage >= totalPages;
    const label = isPrev ? (isChinese ? "上一页" : "Prev") : isChinese ? "下一页" : "Next";

    const href = getHref(target);
    return (
      <PaginationItem>
        {disabled ? (
          <span
            className={cn(
              buttonVariants({ variant: "ghost", size: "default" }),
              "px-3 py-2 text-xs sm:text-sm size-auto opacity-50",
            )}
          >
            {label}
          </span>
        ) : (
          <Link
            href={href}
            className={cn(
              buttonVariants({ variant: "ghost", size: "default" }),
              "px-3 py-2 text-xs sm:text-sm size-auto",
            )}
          >
            {label}
          </Link>
        )}
      </PaginationItem>
    );
  };

  const pageItems = pages.reduce<ReactNode[]>((acc, page, index) => {
    acc.push(renderLink(page, page === currentPage));
    const next = pages[index + 1];
    if (next && next - page > 1) {
      acc.push(<PaginationEllipsis key={`ellipsis-${page}`} className="text-muted-foreground" />);
    }
    return acc;
  }, []);

  return (
    <Pagination className={cn("justify-start", className)}>
      <PaginationContent>
        {renderControl("prev")}
        {pageItems}
        {renderControl("next")}
      </PaginationContent>
    </Pagination>
  );
}


