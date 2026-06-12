'use client';

import { useState } from 'react';
import { useAsyncAction } from '@/hooks/use-async-action';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { deleteInstallationCommentAction } from './actions';
import type { Campus, InstallationTargetWithComments } from '@/lib/db/types';

interface Props {
  targets: InstallationTargetWithComments[];
  campuses: Campus[];
}

export function RequestsPage({ targets, campuses }: Props) {
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const { processingId: deletingCommentId, error, run } = useAsyncAction();

  const filtered =
    campusFilter === 'all'
      ? targets
      : targets.filter((t) => t.campusId === campusFilter);

  async function handleDeleteComment(commentId: string) {
    await run(
      commentId,
      () => deleteInstallationCommentAction(commentId),
      'コメント削除に失敗しました。再試行してください。'
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            設置希望管理
          </h1>
          <p className="text-sm text-slate-500">
            利用者からの設置リクエストと投票・コメント
          </p>
        </div>
        <Select value={campusFilter} onValueChange={setCampusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="キャンパスで絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのキャンパス</SelectItem>
            {campuses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          設置希望がありません
        </p>
      )}

      <div className="space-y-4">
        {filtered.map((target) => (
          <div
            key={target.id}
            className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-sky-600">
                  {target.campus.name}
                </span>
                <h3 className="font-semibold text-slate-900">
                  {target.building.name}
                </h3>
              </div>
              <Badge
                variant="outline"
                className="border-teal-200 bg-teal-50 font-semibold text-teal-700"
              >
                {target.voteCount} 票
              </Badge>
            </div>

            {target.comments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  コメント（管理者のみ閲覧）
                </p>
                {target.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start justify-between gap-2 bg-muted/50 rounded p-2"
                  >
                    <p className="text-sm flex-1">{comment.comment}</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          削除
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            コメントを削除しますか？
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            このコメントを削除します（論理削除）。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={deletingCommentId === comment.id}
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            {deletingCommentId === comment.id
                              ? '削除中...'
                              : '削除する'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}

            {target.comments.length === 0 && (
              <p className="text-sm text-muted-foreground">コメントなし</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
