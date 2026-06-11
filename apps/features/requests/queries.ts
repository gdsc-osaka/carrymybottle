import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { err, ok, ResultAsync, type Result } from 'neverthrow';
import type { DB } from '@/lib/db/client';
import {
  buildings,
  installationTargets,
  installationVotes,
} from '@/lib/db/schema';
import type { VoteInstallationRequestInput } from './validation';

const VOTE_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7;

export type VoteInstallationRequestError =
  | { type: 'BUILDING_NOT_FOUND' }
  | { type: 'ALREADY_VOTED' }
  | { type: 'DB_ERROR'; message: string };

export type GetInstallationRequestBuildingsError = {
  type: 'DB_ERROR';
  message: string;
};

export interface VoteInstallationRequestResult {
  targetId: string;
  campusId: string;
  buildingId: string;
  voteCount: number;
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

async function getOrCreateTarget(
  tx: Parameters<Parameters<DB['transaction']>[0]>[0],
  input: VoteInstallationRequestInput,
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
