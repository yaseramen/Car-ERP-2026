export default async function TenantPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">مركز: {tenant}</h1>
    </div>
  );
}
