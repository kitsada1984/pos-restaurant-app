import KitchenTerminal from '@/components/tenant/KitchenTerminal';

export default function TenantKitchenPage({ params }: { params: { slug: string } }) {
  return <KitchenTerminal slug={params.slug} />;
}
