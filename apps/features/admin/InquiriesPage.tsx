'use client';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAsyncAction } from '@/hooks/use-async-action';
import { cn } from '@/lib/utils';
import { INQUIRY_CATEGORY_LABELS } from '@/lib/constants/inquiries';
import { deleteInquiryAction } from './actions';
import { INQUIRY_CATEGORY_BADGE_CLASS } from './badge-styles';
import type { Inquiry } from '@/lib/db/types';

interface Props {
  inquiries: Inquiry[];
}

export function InquiriesPage({ inquiries }: Props) {
  const { processingId: deletingId, error, run } = useAsyncAction();

  async function handleDelete(id: string) {
    await run(
      id,
      () => deleteInquiryAction(id),
      '削除に失敗しました。時間をおいて再試行してください。'
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          お問い合わせ管理
        </h1>
        <p className="text-sm text-slate-500">
          利用者から届いたお問い合わせ {inquiries.length} 件
        </p>
      </div>
      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">
                受信日時
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                種別
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                お名前
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                内容
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                連絡先メール
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                送信状態
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquiries.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-slate-400"
                >
                  お問い合わせがありません
                </TableCell>
              </TableRow>
            )}
            {inquiries.map((inquiry) => (
              <TableRow key={inquiry.id} className="hover:bg-teal-50/30">
                <TableCell className="text-sm whitespace-nowrap text-slate-600">
                  {new Date(inquiry.createdAt).toLocaleString('ja-JP', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      INQUIRY_CATEGORY_BADGE_CLASS[inquiry.category]
                    )}
                  >
                    {INQUIRY_CATEGORY_LABELS[inquiry.category]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-slate-600">
                  {inquiry.name ?? '—'}
                </TableCell>
                <TableCell className="max-w-72 text-sm break-words whitespace-pre-wrap text-slate-600">
                  {inquiry.message}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {inquiry.reporterEmail}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    {inquiry.adminEmailSentAt ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700"
                      >
                        管理者通知済
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-rose-200 bg-rose-50 text-xs text-rose-700"
                      >
                        管理者通知失敗
                      </Badge>
                    )}
                    {inquiry.autoReplyError ? (
                      <Badge
                        variant="outline"
                        className="border-rose-200 bg-rose-50 text-xs text-rose-700"
                        title={inquiry.autoReplyError}
                      >
                        自動返信失敗
                      </Badge>
                    ) : inquiry.autoReplySentAt ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700"
                      >
                        自動返信済
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                        >
                          削除
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            お問い合わせを削除しますか？
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            このお問い合わせを削除します。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={deletingId === inquiry.id}
                            onClick={() => handleDelete(inquiry.id)}
                          >
                            {deletingId === inquiry.id
                              ? '削除中...'
                              : '削除する'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
