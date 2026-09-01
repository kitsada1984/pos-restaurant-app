import AdminTablesView from '@/components/tenant/AdminTablesView';

export default function TenantAdminTablesPage({ params }: { params: { slug: string } }) {
  return <AdminTablesView slug={params.slug} />;
}
