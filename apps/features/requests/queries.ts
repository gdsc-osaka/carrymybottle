import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { err, ok, ResultAsync, type Result } from 'neverthrow';
import type { DB } from '@/lib/db/client';
import {
  buildings,
  installationComments,
  installationTargets,
  installationVotes,
} from '@/lib/db/schema';
import type {
  SaveInstallationCommentInput,
  VoteInstallationRequestInput,
} from './validation';

const VOTE_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7;
const COMMENT_COOLDOWN_MS = VOTE_COOLDOWN_MS;

export type GetInstallationRequestBuildingsError = {
  type: 'DB_ERROR';
  message: string;
};

export type VoteInstallationRequestError =
  | { type: 'BUILDING_NOT_FOUND' }
  | { type: 'ALREADY_VOTED' }
  | { type: 'DB_ERROR'; message: string };

export type SaveInstallationCommentError =
  | { type: 'BUILDING_NOT_FOUND' }
  | { type: 'ALREADY_COMMENTED' }
  | { type: 'DB_ERROR'; message: string };

export interface VoteInstallationRequestResult {
  targetId: string;
  campusId: string;
  buildingId: string;
  voteCount: number;
}

export interface SaveInstallationCommentResult {
  commentId: string;
  targetId: string;
  campusId: string;
  buildingId: string;
}

export interface InstallationRequestBuilding {
  campusId: string;
  buildingId: string;
  buildingName: string;
  targetId: string | null;
  voteCount: number;
}

export function getInstallationRequestBuildings(
  db: DB,
  campusId: string
): ResultAsync<
  InstallationRequestBuilding[],
  GetInstallationRequestBuildingsError
> {
  return ResultAsync.fromPromise(
    db
      .select({
        campusId: buildings.campusId,
        buildingId: buildings.id,
        buildingName: buildings.name,
        targetId: installationTargets.id,
        voteCount: installationTargets.voteCount,
      })
      .from(buildings)
      .leftJoin(
        installationTargets,
        and(
          eq(installationTargets.buildingId, buildings.id),
          eq(installationTargets.campusId, buildings.campusId)
        )
      )
      .where(eq(buildings.campusId, campusId))
      .orderBy(asc(buildings.sortOrder), asc(buildings.name)),
    (error): GetInstallationRequestBuildingsError => ({
      type: 'DB_ERROR',
      message: error instanceof Error ? error.message : String(error),
    })
  ).map((rows) =>
    rows.map((row) => ({
      ...row,
      voteCount: row.voteCount ?? 0,
    }))
  );
}

export function voteForInstallationTarget(
  db: DB,
  input: VoteInstallationRequestInput,
  voterTokenHash: string,
  now = new Date()
): ResultAsync<VoteInstallationRequestResult, VoteInstallationRequestError> {
  return ResultAsync.fromPromise(
    // D1 は対話的トランザクション(BEGIN/COMMIT)を持たないため db.transaction()
    // は使えない。整合性チェックは db に直接問い合わせ、票の追加とカウント更新
    // のみ db.batch() でアトミックに実行する。
    (async (): Promise<
      Result<VoteInstallationRequestResult, VoteInstallationRequestError>
    > => {
      const [building] = await db
        .select({ id: buildings.id })
        .from(buildings)
        .where(
          and(
            eq(buildings.id, input.buildingId),
            eq(buildings.campusId, input.campusId)
          )
        )
        .limit(1);

      if (!building) {
        return err({ type: 'BUILDING_NOT_FOUND' });
      }

      const target = await getOrCreateTarget(db, input, now);
      if (!target) {
        return err({
          type: 'DB_ERROR',
          message: 'failed to create installation target',
        });
      }

      const cooldownStartedAt = new Date(now.getTime() - VOTE_COOLDOWN_MS);
      const [recentVote] = await db
        .select({ id: installationVotes.id })
        .from(installationVotes)
        .where(
          and(
            eq(installationVotes.targetId, target.id),
            eq(installationVotes.voterTokenHash, voterTokenHash),
            gte(installationVotes.createdAt, cooldownStartedAt)
          )
        )
        .limit(1);

      if (recentVote) {
        return err({ type: 'ALREADY_VOTED' });
      }

      await db.batch([
        db.insert(installationVotes).values({
          id: `vote_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`,
          targetId: target.id,
          voterTokenHash,
          createdAt: now,
        }),
        db
          .update(installationTargets)
          .set({
            voteCount: sql`${installationTargets.voteCount} + 1`,
            updatedAt: now,
          })
          .where(eq(installationTargets.id, target.id)),
      ]);

      const [updatedTarget] = await db
        .select()
        .from(installationTargets)
        .where(eq(installationTargets.id, target.id))
        .limit(1);

      if (!updatedTarget) {
        return err({
          type: 'DB_ERROR',
          message: 'failed to reload installation target',
        });
      }

      return ok({
        targetId: updatedTarget.id,
        campusId: updatedTarget.campusId,
        buildingId: updatedTarget.buildingId,
        voteCount: updatedTarget.voteCount,
      });
    })(),
    (error): VoteInstallationRequestError => ({
      type: 'DB_ERROR',
      message: error instanceof Error ? error.message : String(error),
    })
  ).andThen((result) => result);
}

export function saveInstallationComment(
  db: DB,
  input: SaveInstallationCommentInput,
  voterTokenHash: string,
  now = new Date()
): ResultAsync<SaveInstallationCommentResult, SaveInstallationCommentError> {
  return ResultAsync.fromPromise(
    // D1 は対話的トランザクション(BEGIN/COMMIT)を持たないため db.transaction()
    // は使えない。整合性チェックは db に直接問い合わせ、コメント追加は単一文の
    // ため db.insert() をそのまま実行する。
    (async (): Promise<
      Result<SaveInstallationCommentResult, SaveInstallationCommentError>
    > => {
      const [building] = await db
        .select({ id: buildings.id })
        .from(buildings)
        .where(
          and(
            eq(buildings.id, input.buildingId),
            eq(buildings.campusId, input.campusId)
          )
        )
        .limit(1);

      if (!building) {
        return err({ type: 'BUILDING_NOT_FOUND' });
      }

      const target = await getOrCreateTarget(db, input, now);
      if (!target) {
        return err({
          type: 'DB_ERROR',
          message: 'failed to create installation target',
        });
      }

      const cooldownStartedAt = new Date(now.getTime() - COMMENT_COOLDOWN_MS);
      const [recentComment] = await db
        .select({ id: installationComments.id })
        .from(installationComments)
        .where(
          and(
            eq(installationComments.targetId, target.id),
            eq(installationComments.voterTokenHash, voterTokenHash),
            gte(installationComments.createdAt, cooldownStartedAt)
          )
        )
        .limit(1);

      if (recentComment) {
        return err({ type: 'ALREADY_COMMENTED' });
      }

      const commentId = `comment_${crypto
        .randomUUID()
        .replaceAll('-', '')
        .slice(0, 12)}`;

      await db.insert(installationComments).values({
        id: commentId,
        targetId: target.id,
        comment: input.comment,
        voterTokenHash,
        createdAt: now,
      });

      return ok({
        commentId,
        targetId: target.id,
        campusId: target.campusId,
        buildingId: target.buildingId,
      });
    })(),
    (error): SaveInstallationCommentError => ({
      type: 'DB_ERROR',
      message: error instanceof Error ? error.message : String(error),
    })
  ).andThen((result) => result);
}

async function getOrCreateTarget(
  db: DB,
  input: Pick<VoteInstallationRequestInput, 'campusId' | 'buildingId'>,
  now: Date
) {
  const [existingTarget] = await db
    .select()
    .from(installationTargets)
    .where(
      and(
        eq(installationTargets.campusId, input.campusId),
        eq(installationTargets.buildingId, input.buildingId)
      )
    )
    .limit(1);

  if (existingTarget) {
    return existingTarget;
  }

  await db
    .insert(installationTargets)
    .values({
      id: `target_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`,
      campusId: input.campusId,
      buildingId: input.buildingId,
      voteCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  const [target] = await db
    .select()
    .from(installationTargets)
    .where(
      and(
        eq(installationTargets.campusId, input.campusId),
        eq(installationTargets.buildingId, input.buildingId)
      )
    )
    .limit(1);

  return target;
}
