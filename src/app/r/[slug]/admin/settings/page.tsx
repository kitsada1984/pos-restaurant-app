import AdminSettingsView from '@/components/tenant/AdminSettingsView';

export default function TenantAdminSettingsPage({ params }: { params: { slug: string } }) {
  return <AdminSettingsView slug={params.slug} />;
}
