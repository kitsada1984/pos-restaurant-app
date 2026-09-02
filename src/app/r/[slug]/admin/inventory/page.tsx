import React from 'react';
import AdminInventoryView from '@/components/tenant/AdminInventoryView';

export default function TenantInventoryPage({
  params,
}: {
  params: { slug: string };
}) {
  return <AdminInventoryView slug={params.slug} />;
}
