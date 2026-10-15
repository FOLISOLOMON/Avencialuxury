import { redirect } from "next/navigation";

export default async function SettingsCategorySubroute({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  redirect(`/settings?category=${encodeURIComponent(category)}`);
}
