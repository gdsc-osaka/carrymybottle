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
import { deleteEmergencyContactAction } from './actions';
import { ISSUE_TYPE_LABELS } from './validation';
import { ISSUE_BADGE_CLASS } from './badge-styles';
import type { EmergencyContactWithStation } from '@/lib/db/types';

interface Props {
  contacts: EmergencyContactWithStation[];
}

export function ContactsPage({ contacts }: Props) {
  const { processingId: deletingId, error, run } = useAsyncAction();

  async function handleDelete(id: string) {
    await run(
      id,
      () => deleteEmergencyContactAction(id),
      '削除に失敗しました。時間をおいて再試行してください。'
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">緊急連絡管理</h1>
        <p className="text-sm text-slate-500">
          利用者から届いた不具合報告 {contacts.length} 件
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
                対象給水機
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                問題種別
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
            {contacts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-slate-400"
                >
                  緊急連絡がありません
                </TableCell>
              </TableRow>
            )}
            {contacts.map((contact) => (
              <TableRow key={contact.id} className="hover:bg-rose-50/30">
                <TableCell className="text-sm whitespace-nowrap text-slate-600">
                  {new Date(contact.createdAt).toLocaleString('ja-JP', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell className="text-sm font-medium text-slate-900">
                  {contact.station.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(ISSUE_BADGE_CLASS[contact.issueType])}
                  >
                    {ISSUE_TYPE_LABELS[contact.issueType]}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-48 truncate text-sm text-slate-600">
                  {contact.message}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {contact.reporterEmail}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    {contact.adminEmailSentAt ? (
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
                    {contact.autoReplyError ? (
                      <Badge
                        variant="outline"
                        className="border-rose-200 bg-rose-50 text-xs text-rose-700"
                        title={contact.autoReplyError}
                      >
                        自動返信失敗
                      </Badge>
                    ) : contact.autoReplySentAt ? (
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
                            緊急連絡を削除しますか？
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            この緊急連絡を削除します（論理削除）。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={deletingId === contact.id}
                            onClick={() => handleDelete(contact.id)}
                          >
                            {deletingId === contact.id
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
