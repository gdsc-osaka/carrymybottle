import { and, eq, gte, sql } from 'drizzle-orm';
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

export function voteForInstallationTarget(
  db: DB,
  input: VoteInstallationRequestInput,
  voterTokenHash: string,
  now = new Date()
): ResultAsync<VoteInstallationRequestResult, VoteInstallationRequestError> {
  return ResultAsync.fromPromise(
    db.transaction(
      async (
        tx
      ): Promise<
        Result<VoteInstallationRequestResult, VoteInstallationRequestError>
      > => {
        const [building] = await tx
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

        const target = await getOrCreateTarget(tx, input, now);
        if (!target) {
          return err({
            type: 'DB_ERROR',
            message: 'failed to create installation target',
          });
        }

        const cooldownStartedAt = new Date(now.getTime() - VOTE_COOLDOWN_MS);
        const [recentVote] = await tx
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

        await tx.insert(installationVotes).values({
          id: `vote_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`,
          targetId: target.id,
          voterTokenHash,
          createdAt: now,
        });

        await tx
          .update(installationTargets)
          .set({
            voteCount: sql`${installationTargets.voteCount} + 1`,
            updatedAt: now,
          })
          .where(eq(installationTargets.id, target.id));

        const [updatedTarget] = await tx
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
      }
    ),
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
    db.transaction(
      async (
        tx
      ): Promise<
        Result<SaveInstallationCommentResult, SaveInstallationCommentError>
      > => {
        const [building] = await tx
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

        const target = await getOrCreateTarget(tx, input, now);
        if (!target) {
          return err({
            type: 'DB_ERROR',
            message: 'failed to create installation target',
          });
        }

        const cooldownStartedAt = new Date(now.getTime() - COMMENT_COOLDOWN_MS);
        const [recentComment] = await tx
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

        await tx.insert(installationComments).values({
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
      }
    ),
    (error): SaveInstallationCommentError => ({
      type: 'DB_ERROR',
      message: error instanceof Error ? error.message : String(error),
    })
  ).andThen((result) => result);
}

async function getOrCreateTarget(
  tx: Parameters<Parameters<DB['transaction']>[0]>[0],
  input: Pick<VoteInstallationRequestInput, 'campusId' | 'buildingId'>,
  now: Date
) {
  const [existingTarget] = await tx
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

  await tx
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

  const [target] = await tx
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
