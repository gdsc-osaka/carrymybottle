import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ContactsPage } from '@/features/admin/ContactsPage';
import { getDb } from '@/lib/db/client';
import { getEmergencyContacts } from '@/features/admin/queries';

export default async function Page() {
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const contacts = await getEmergencyContacts(db);
  return <ContactsPage contacts={contacts} />;
}
