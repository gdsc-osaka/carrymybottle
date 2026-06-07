import { z } from 'zod';

export const voteInstallationRequestSchema = z.object({
  campusId: z.string().min(1, 'キャンパスを選択してください'),
  buildingId: z.string().min(1, '建物を選択してください'),
});

export type VoteInstallationRequestInput = z.infer<
  typeof voteInstallationRequestSchema
>;
