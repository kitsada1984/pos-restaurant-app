'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import CustomerOrderingView from '@/components/tenant/CustomerOrderingView';

export default function TableOrderingPage() {
  const params = useParams();
  const tableId = params?.id ? parseInt(params.id as string, 10) || 1 : 1;

  return <CustomerOrderingView slug="lung-pa" tableId={tableId} />;
}
