'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db/client';
import { getOrCreateVoteTokenHash } from '@/lib/auth/vote-token';
import { saveInstallationComment, voteForInstallationTarget } from './queries';
import {
  saveInstallationCommentSchema,
  voteInstallationRequestSchema,
} from './validation';
import type {
  SaveInstallationCommentError,
  VoteInstallationRequestError,
} from './queries';

export type RequestActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function extractVoteFormData(formData: FormData) {
  return {
    campusId: formData.get('campusId'),
    buildingId: formData.get('buildingId'),
  };
}

function extractCommentFormData(formData: FormData) {
  return {
    campusId: formData.get('campusId'),
    buildingId: formData.get('buildingId'),
    comment: formData.get('comment'),
  };
}

export async function voteInstallationRequestAction(
  formData: FormData
): Promise<
  RequestActionResult<{
    targetId: string;
    campusId: string;
    buildingId: string;
    voteCount: number;
  }>
> {
  const parsed = voteInstallationRequestSchema.safeParse(
    extractVoteFormData(formData)
  );

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tokenHashResult = await getOrCreateVoteTokenHash();
  if (tokenHashResult.isErr()) {
    return {
      success: false,
      error:
        '投票の識別情報を作成できませんでした。時間をおいて再試行してください。',
    };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const voteResult = await voteForInstallationTarget(
    db,
    parsed.data,
    tokenHashResult.value
  );

  if (voteResult.isErr()) {
    return {
      success: false,
      error: toVoteErrorMessage(voteResult.error),
    };
  }

  revalidatePath('/requests');
  revalidatePath('/admin/requests');

  return {
    success: true,
    data: voteResult.value,
  };
}

export async function saveInstallationCommentAction(
  formData: FormData
): Promise<
  RequestActionResult<{
    commentId: string;
    targetId: string;
    campusId: string;
    buildingId: string;
  }>
> {
  const parsed = saveInstallationCommentSchema.safeParse(
    extractCommentFormData(formData)
  );

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  const commentResult = await saveInstallationComment(db, parsed.data);

  if (commentResult.isErr()) {
    return {
      success: false,
      error: toCommentErrorMessage(commentResult.error),
    };
  }

  revalidatePath('/admin/requests');

  return {
    success: true,
    data: commentResult.value,
  };
}

function toVoteErrorMessage(error: VoteInstallationRequestError): string {
  switch (error.type) {
    case 'BUILDING_NOT_FOUND':
      return '選択した建物が見つかりません。再度選択してください。';
    case 'ALREADY_VOTED':
      return 'この建物にはすでに投票済みです。7日後に再投票できます。';
    case 'DB_ERROR':
      return '投票の保存に失敗しました。時間をおいて再試行してください。';
  }
}

function toCommentErrorMessage(error: SaveInstallationCommentError): string {
  switch (error.type) {
    case 'BUILDING_NOT_FOUND':
      return '選択した建物が見つかりません。再度選択してください。';
    case 'DB_ERROR':
      return 'コメントの保存に失敗しました。時間をおいて再試行してください。';
  }
}
