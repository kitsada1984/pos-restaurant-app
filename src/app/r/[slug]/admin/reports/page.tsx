import AdminReportsView from '@/components/tenant/AdminReportsView';

export default function TenantAdminReportsPage({ params }: { params: { slug: string } }) {
  return <AdminReportsView slug={params.slug} />;
}
