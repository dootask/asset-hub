import type { Metadata } from "next";
import ApprovalDetailPageClient from "@/components/approvals/ApprovalDetailPageClient";

type PageParams = { locale: string; id: string };
type PageProps = {
  params: Promise<PageParams>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Approval ${id} - Asset Hub`,
  };
}

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  return <ApprovalDetailPageClient locale={locale} id={id} />;
}
