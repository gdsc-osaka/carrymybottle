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
import { useState } from 'react';
import { deleteEmergencyContactAction } from './actions';
import { ISSUE_TYPE_LABELS } from './validation';
import type { EmergencyContactWithStation } from '@/lib/db/types';

interface Props {
  contacts: EmergencyContactWithStation[];
}

export function ContactsPage({ contacts }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (deletingId) return;
    setError(null);
    setDeletingId(id);
    try {
      await deleteEmergencyContactAction(id);
    } catch {
      setError('削除に失敗しました。時間をおいて再試行してください。');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">緊急連絡管理</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日時</TableHead>
              <TableHead>給水機</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>内容</TableHead>
              <TableHead>連絡者</TableHead>
              <TableHead>メール状態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  緊急連絡がありません
                </TableCell>
              </TableRow>
            )}
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="text-sm whitespace-nowrap">
                  {new Date(contact.createdAt).toLocaleString('ja-JP', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell className="text-sm">
                  {contact.station.name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {ISSUE_TYPE_LABELS[contact.issueType]}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-48 truncate text-sm">
                  {contact.message}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {contact.reporterEmail}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {contact.adminEmailSentAt ? (
                      <Badge variant="secondary" className="text-xs">
                        管理者通知済
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        管理者通知失敗
                      </Badge>
                    )}
                    {contact.autoReplyError ? (
                      <Badge
                        variant="destructive"
                        className="text-xs block"
                        title={contact.autoReplyError}
                      >
                        自動返信失敗
                      </Badge>
                    ) : contact.autoReplySentAt ? (
                      <Badge variant="secondary" className="text-xs block">
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
