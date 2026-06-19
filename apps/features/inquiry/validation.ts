import { z } from 'zod';
import { INQUIRY_CATEGORIES } from '@/lib/constants/inquiries';

export const inquirySchema = z.object({
  category: z.enum(INQUIRY_CATEGORIES),
  // 氏名は任意。空文字は未入力として扱い、保存時に null へ寄せる。
  name: z
    .string()
    .trim()
    .max(100, 'お名前は100文字以内で入力してください')
    .optional()
    .transform((value) => (value ? value : undefined)),
  message: z
    .string()
    .trim()
    .min(1, 'お問い合わせ内容を入力してください')
    .max(2000, 'お問い合わせ内容は2000文字以内で入力してください'),
  reporterEmail: z
    .string()
    .trim()
    .email('有効なメールアドレスを入力してください'),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
