'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  type IssueType,
} from '@/lib/constants/contacts';

type Props = {
  stationId: string;
};

export function ContactPage({ stationId }: Props) {
  const [issueType, setIssueType] = useState<IssueType | ''>('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // #74 で Server Action を呼び出す予定
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg font-medium">送信が完了しました</p>
        <p className="text-sm text-muted-foreground">
          ご連絡ありがとうございます。確認次第対応いたします。
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="border-b bg-card p-4 shadow-sm">
        <h1 className="text-xl font-bold">緊急連絡フォーム</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          給水機 ID: {stationId}
        </p>
      </header>

      <main className="flex-1 p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <Label className="text-sm font-medium">不具合の種類</Label>
            <RadioGroup
              value={issueType}
              onValueChange={(v) => setIssueType(v as IssueType)}
              required
            >
              {ISSUE_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-3">
                  <RadioGroupItem value={type} id={`issue-type-${type}`} />
                  <Label
                    htmlFor={`issue-type-${type}`}
                    className="cursor-pointer font-normal"
                  >
                    {ISSUE_TYPE_LABELS[type]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </section>

          {/* Issue #73 で実装予定: メッセージ本文・連絡者メールアドレス入力 */}
          <section className="flex flex-col gap-2">
            <p className="text-sm font-medium">詳細・連絡先</p>
            <div className="rounded-lg border border-dashed bg-muted p-4 text-center text-sm text-muted-foreground">
              【Issue #73 実装予定】メッセージ本文・連絡者メールアドレス入力
            </div>
          </section>

          <Button type="submit" className="w-full" size="lg">
            送信する
          </Button>
        </form>
      </main>
    </div>
  );
}
