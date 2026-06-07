import { z } from 'zod';
import { ISSUE_TYPES } from '@/lib/constants/contacts';

export const contactSchema = z.object({
  stationId: z.string().min(1),
  issueType: z.enum(ISSUE_TYPES),
  message: z.string().min(1, '詳細内容を入力してください'),
  reporterEmail: z.string().email('有効なメールアドレスを入力してください'),
});

export type ContactInput = z.infer<typeof contactSchema>;
