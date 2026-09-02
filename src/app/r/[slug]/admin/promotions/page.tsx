import React from 'react';
import AdminLoyaltyView from '@/components/tenant/AdminLoyaltyView';

export default function TenantPromotionsPage({
  params,
}: {
  params: { slug: string };
}) {
  return <AdminLoyaltyView slug={params.slug} />;
}
