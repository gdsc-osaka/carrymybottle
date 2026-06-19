import { z } from 'zod';

export const voteInstallationRequestSchema = z.object({
  campusId: z.string().min(1, 'キャンパスを選択してください'),
  buildingId: z.string().min(1, '建物を選択してください'),
});

export type VoteInstallationRequestInput = z.infer<
  typeof voteInstallationRequestSchema
>;

// 投票と同時に任意でコメントを受け取るスキーマ（地図/設置リクエストの投票モーダル用）。
// コメントは任意。空文字は未入力として undefined に寄せる。
export const voteWithCommentSchema = voteInstallationRequestSchema.extend({
  comment: z
    .string()
    .trim()
    .max(1000, 'コメントは1000文字以内で入力してください')
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type VoteWithCommentInput = z.infer<typeof voteWithCommentSchema>;

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
