import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function LegacyAdminQrCodesPage() {
  const slug = cookies().get('last_store_slug')?.value || 'lung-pa';
  redirect(`/r/${slug}/admin/qr-codes`);
}
