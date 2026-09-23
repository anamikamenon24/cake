import { redirect } from "next/navigation";

export default async function CakeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/customise/${id}`);
}
