'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { err, ok, ResultAsync, type Result } from 'neverthrow';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db/client';
import { getOrCreateVoteTokenHash } from '@/lib/auth/vote-token';
import { trackEvent } from '@/lib/analytics/events';
import { enforceRateLimit } from '@/lib/rate-limit';
import { saveInstallationComment, voteForInstallationTarget } from './queries';
import {
  type SaveInstallationCommentInput,
  saveInstallationCommentSchema,
  voteWithCommentSchema,
} from './validation';
import type {
  SaveInstallationCommentError,
  SaveInstallationCommentResult,
  VoteInstallationRequestError,
} from './queries';

export type RequestActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

type SaveInstallationCommentActionError =
  | SaveInstallationCommentError
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'TOKEN_ERROR' }
  | { type: 'CONTEXT_ERROR' };

function extractVoteFormData(formData: FormData) {
  return {
    campusId: formData.get('campusId'),
    buildingId: formData.get('buildingId'),
    // 任意コメント。未入力(null)は undefined に寄せて optional 検証に通す。
    comment: formData.get('comment') ?? undefined,
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
  const rateLimit = await enforceRateLimit('vote');
  if (rateLimit.isErr() && rateLimit.error.type === 'RATE_LIMITED') {
    return {
      success: false,
      error: '投票が集中しています。しばらくしてから再度お試しください。',
    };
  }

  const parsed = voteWithCommentSchema.safeParse(extractVoteFormData(formData));

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

  await trackEvent({
    eventName: 'installation_request_voted',
    campusId: voteResult.value.campusId,
    buildingId: voteResult.value.buildingId,
  });

  // コメントが入力されていれば投票成功後に保存する。コメントは任意の付帯情報で、
  // 保存失敗(クールダウン等)は投票の成否に影響させない(ベストエフォート)。
  if (parsed.data.comment) {
    const commentResult = await saveInstallationComment(
      db,
      {
        campusId: parsed.data.campusId,
        buildingId: parsed.data.buildingId,
        comment: parsed.data.comment,
      },
      tokenHashResult.value
    );
    if (commentResult.isOk()) {
      await trackEvent({
        eventName: 'installation_request_commented',
        campusId: commentResult.value.campusId,
        buildingId: commentResult.value.buildingId,
      });
    }
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
): Promise<RequestActionResult<SaveInstallationCommentResult>> {
  const result = await parseInstallationCommentFormData(formData)
    .asyncAndThen((input) =>
      getOrCreateVoteTokenHash()
        .mapErr(
          (): SaveInstallationCommentActionError => ({ type: 'TOKEN_ERROR' })
        )
        .andThen((voterTokenHash) =>
          getCloudflareContextResult()
            .mapErr(
              (): SaveInstallationCommentActionError => ({
                type: 'CONTEXT_ERROR',
              })
            )
            .andThen(({ env }) =>
              saveInstallationComment(
                getDb(env.DB),
                input,
                voterTokenHash
              ).mapErr((error): SaveInstallationCommentActionError => error)
            )
        )
    )
    .map((data) => {
      void trackEvent({
        eventName: 'installation_request_commented',
        campusId: data.campusId,
        buildingId: data.buildingId,
      });
      revalidatePath('/admin/requests');
      return data;
    });

  return result.match(
    (data) => ({ success: true, data }),
    (error) => ({ success: false, error: toCommentActionErrorMessage(error) })
  );
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
    case 'ALREADY_COMMENTED':
      return 'この建物には最近コメント済みです。時間をおいて再度投稿してください。';
    case 'BUILDING_NOT_FOUND':
      return '選択した建物が見つかりません。再度選択してください。';
    case 'DB_ERROR':
      return 'コメントの保存に失敗しました。時間をおいて再試行してください。';
  }
}

function toCommentActionErrorMessage(
  error: SaveInstallationCommentActionError
): string {
  switch (error.type) {
    case 'VALIDATION_ERROR':
      return error.message;
    case 'TOKEN_ERROR':
      return 'コメントの識別情報を作成できませんでした。時間をおいて再試行してください。';
    case 'CONTEXT_ERROR':
      return 'サーバー設定の取得に失敗しました。時間をおいて再試行してください。';
    default:
      return toCommentErrorMessage(error);
  }
}

function parseInstallationCommentFormData(
  formData: FormData
): Result<SaveInstallationCommentInput, SaveInstallationCommentActionError> {
  const parsed = saveInstallationCommentSchema.safeParse(
    extractCommentFormData(formData)
  );

  if (!parsed.success) {
    return err({
      type: 'VALIDATION_ERROR',
      message: parsed.error.issues[0].message,
    });
  }

  return ok(parsed.data);
}

function getCloudflareContextResult() {
  return ResultAsync.fromPromise(
    getCloudflareContext({ async: true }),
    (error) => new Error(`failed to load Cloudflare context: ${String(error)}`)
  );
}
