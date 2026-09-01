import AdminMenuView from '@/components/tenant/AdminMenuView';

export default function TenantAdminMenuPage({ params }: { params: { slug: string } }) {
  return <AdminMenuView slug={params.slug} />;
}
