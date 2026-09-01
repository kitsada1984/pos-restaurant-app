import CustomerOrderingView from '@/components/tenant/CustomerOrderingView';

export default function TenantTableOrderPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const tableId = parseInt(params.id) || 1;
  return <CustomerOrderingView slug={params.slug} tableId={tableId} />;
}
