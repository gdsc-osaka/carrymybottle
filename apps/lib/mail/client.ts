import { Resend } from 'resend';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function getMailClient(): Promise<Resend> {
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}
