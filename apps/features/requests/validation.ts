import { z } from 'zod';

export const voteInstallationRequestSchema = z.object({
  campusId: z.string().min(1, 'キャンパスを選択してください'),
  buildingId: z.string().min(1, '建物を選択してください'),
});

export type VoteInstallationRequestInput = z.infer<
  typeof voteInstallationRequestSchema
>;

export const saveInstallationCommentSchema =
  voteInstallationRequestSchema.extend({
    comment: z
      .string()
      .trim()
      .min(1, 'コメントを入力してください')
      .max(1000, 'コメントは1000文字以内で入力してください'),
  });

export type SaveInstallationCommentInput = z.infer<
  typeof saveInstallationCommentSchema
>;
