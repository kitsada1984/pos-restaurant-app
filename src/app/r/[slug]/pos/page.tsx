import PosTerminal from '@/components/tenant/PosTerminal';

export default function TenantPosPage({ params }: { params: { slug: string } }) {
  return <PosTerminal slug={params.slug} />;
}
