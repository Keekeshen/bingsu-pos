import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import TableOrderMenu from "@/components/client/TableOrderMenu";

const TABLE_SLUG_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function TableOrderSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!TABLE_SLUG_RE.test(slug)) notFound();

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("tables")
    .select("id, table_number")
    .eq("id", slug)
    .maybeSingle();

  if (!row) notFound();

  return <TableOrderMenu tableSlug={slug} tableNumber={String(row.table_number ?? "")} />;
}
