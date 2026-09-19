import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function LegacyAdminMenuPage() {
  const slug = cookies().get('last_store_slug')?.value || 'lung-pa';
  redirect(`/r/${slug}/admin/menu`);
}
