import Link from "next/link";

type Props = {
  locale: string;
  currentLabelZh: string;
  currentLabelEn: string;
};

export default function SystemBreadcrumb({
  locale,
  currentLabelZh,
  currentLabelEn,
}: Props) {
  const isChinese = locale === "zh";
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link
        href={`/${locale}/system`}
        className="text-muted-foreground hover:text-foreground"
      >
        {isChinese ? "系统管理" : "System"}
      </Link>
      <span className="text-muted-foreground/70">/</span>
      <span className="font-medium text-foreground">
        {isChinese ? currentLabelZh : currentLabelEn}
      </span>
    </div>
  );
}


