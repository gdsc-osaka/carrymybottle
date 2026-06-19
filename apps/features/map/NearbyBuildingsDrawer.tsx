'use client';

import { useState } from 'react';
import { Building2, CheckCircle2, MapPin, Vote } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { voteInstallationRequestAction } from '@/features/requests/actions';
import { formatDistance } from './voting';
import type { MapVoteBuilding } from './queries';

export type NearbyVoteBuilding = MapVoteBuilding & { distanceMeters: number };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: NearbyVoteBuilding[];
  /** 投票成功時に親へ最新の投票数を通知し、表示を更新させる。 */
  onVoted: (buildingId: string, voteCount: number) => void;
  /** この操作で投票済みの建物ID。「投票済み」表示にして再投票を抑止する。 */
  votedBuildingIds: Set<string>;
}

/**
 * 投票モードで「ここで探す」を押したときに表示する、近接建物のボトムシート。
 * 各建物からその場で設置希望に投票できる（既存の voteInstallationRequestAction
 * を再利用：建物単位集約・7日クールダウン・vote-token Cookie・レート制限）。
 */
export function NearbyBuildingsDrawer({
  open,
  onOpenChange,
  candidates,
  onVoted,
  votedBuildingIds,
}: Props) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  // 投票確認モーダルの対象建物（コメント入力用）。null のとき非表示。
  const [commentTarget, setCommentTarget] = useState<NearbyVoteBuilding | null>(
    null
  );
  const [comment, setComment] = useState('');

  function openVoteDialog(building: NearbyVoteBuilding) {
    // 設置済み・投票済みは投票不可（UI でも無効化しているが二重ガード）。
    if (building.hasStation || votedBuildingIds.has(building.buildingId)) {
      return;
    }
    setComment('');
    setCommentTarget(building);
  }

  async function handleVote() {
    const building = commentTarget;
    if (!building || submittingId) {
      return;
    }
    setSubmittingId(building.buildingId);

    const formData = new FormData();
    formData.set('campusId', building.campusId);
    formData.set('buildingId', building.buildingId);
    if (comment.trim()) {
      formData.set('comment', comment.trim());
    }

    try {
      const result = await voteInstallationRequestAction(formData);
      if (result.success) {
        toast.success(`${building.buildingName} に投票しました`);
        onVoted(building.buildingId, result.data.voteCount);
        setCommentTarget(null);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('投票に失敗しました。時間をおいて再試行してください。');
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-center gap-2">
            <MapPin className="size-4 text-[#0f897f]" aria-hidden="true" />
            近くの建物に投票
          </DrawerTitle>
          <DrawerDescription>
            設置してほしい建物を選んで投票しましょう
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6">
          {candidates.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {candidates.map((building) => {
                const isSubmitting = submittingId === building.buildingId;
                const isVoted = votedBuildingIds.has(building.buildingId);
                return (
                  <li
                    key={building.buildingId}
                    className="flex items-center gap-3 rounded-xl border border-[#0f897f]/15 bg-white p-3 shadow-sm"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center gap-2 font-medium">
                        <Building2
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {building.buildingName}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDistance(building.distanceMeters)}</span>
                        <Badge variant="outline" className="shrink-0">
                          {building.voteCount}票
                        </Badge>
                      </span>
                    </span>
                    {building.hasStation ? (
                      // 給水機が設置済みの建物は設置希望の対象外。
                      <Badge
                        variant="secondary"
                        className="h-9 shrink-0 rounded-md px-3"
                      >
                        設置済み
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="h-10 shrink-0 bg-gradient-to-r from-[#0f897f] to-[#1f6fc4] text-white shadow-sm hover:opacity-90 sm:h-9"
                        disabled={isSubmitting || isVoted}
                        onClick={() => openVoteDialog(building)}
                      >
                        {isSubmitting ? (
                          <Spinner className="size-4" />
                        ) : isVoted ? (
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                        ) : (
                          <Vote className="size-4" aria-hidden="true" />
                        )}
                        {isSubmitting
                          ? '投票中...'
                          : isVoted
                            ? '投票済み'
                            : '投票'}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              この地点の近くに登録された建物がありません。地図を動かして別の場所を試してください。
            </p>
          )}
        </div>
      </DrawerContent>

      {/* 投票確認モーダル：コメント（任意）を入力して投票を確定する。 */}
      <Dialog
        open={commentTarget !== null}
        onOpenChange={(next) => {
          if (!next) setCommentTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="size-4 text-[#0f897f]" aria-hidden="true" />
              {commentTarget?.buildingName} に投票
            </DialogTitle>
            <DialogDescription>
              この建物への設置希望に投票します。コメント（任意）を添えられます。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="map-vote-comment">コメント（任意）</Label>
            <Textarea
              id="map-vote-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="例: 階数や設置してほしい場所の希望など"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCommentTarget(null)}
              disabled={submittingId !== null}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-[#0f897f] to-[#1f6fc4] text-white hover:opacity-90"
              onClick={handleVote}
              disabled={submittingId !== null}
            >
              {submittingId !== null ? (
                <Spinner className="size-4" />
              ) : (
                <Vote className="size-4" aria-hidden="true" />
              )}
              {submittingId !== null ? '投票中...' : '投票する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}
