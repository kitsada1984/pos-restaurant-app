import AdminQrCodesView from '@/components/tenant/AdminQrCodesView';

export default function TenantAdminQrCodesPage({ params }: { params: { slug: string } }) {
  return <AdminQrCodesView slug={params.slug} />;
}
