import { ContactPage } from '@/features/contact/ContactPage';

export default async function Page({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;
  return <ContactPage stationId={stationId} />;
}
