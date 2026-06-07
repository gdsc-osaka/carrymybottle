'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  type IssueType,
} from '@/lib/constants/contacts';
import { submitContactAction } from './actions';

type Props = {
  stationId: string;
};

export function ContactPage({ stationId }: Props) {
  const [issueType, setIssueType] = useState<IssueType | ''>('');
  const [message, setMessage] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    const formData = new FormData();
    formData.set('stationId', stationId);
    formData.set('issueType', issueType);
    formData.set('message', message);
    formData.set('reporterEmail', reporterEmail);

    const result = await submitContactAction(formData);
    if (result.success) {
      setIsSubmitted(true);
    } else {
      setErrorMessage(result.error);
    }
    setIsSubmitting(false);
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

          <section className="flex flex-col gap-2">
            <Label htmlFor="message" className="text-sm font-medium">
              詳細内容
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="状況を詳しく教えてください"
              required
              rows={4}
            />
          </section>

          <section className="flex flex-col gap-2">
            <Label htmlFor="reporter-email" className="text-sm font-medium">
              連絡先メールアドレス
            </Label>
            <Input
              id="reporter-email"
              type="email"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              受付完了メールをお送りします
            </p>
          </section>

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? '送信中...' : '送信する'}
          </Button>
        </form>
      </main>
    </div>
  );
}
