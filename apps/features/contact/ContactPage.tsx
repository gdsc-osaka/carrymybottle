'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Droplet } from 'lucide-react';
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
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#f7f9fb] p-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0f897f] to-[#1f6fc4] text-white shadow-lg shadow-[#1f6fc4]/25">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </span>
        <p className="text-lg font-bold text-[#191c1e]">送信が完了しました</p>
        <p className="max-w-xs text-sm leading-relaxed text-[#46595a]">
          ご連絡ありがとうございます。確認次第対応いたします。
        </p>
        <Button
          asChild
          variant="ghost"
          className="mt-2 text-[#0f897f] hover:bg-[#0f897f]/10 hover:text-[#00685f]"
        >
          <Link href={`/stations/${stationId}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            給水機の詳細に戻る
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f7f9fb]">
      <header className="border-b border-[#0f897f]/10 bg-white/80 px-4 pt-4 pb-3 shadow-sm backdrop-blur-md">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-1 w-fit text-[#0f897f] hover:bg-[#0f897f]/10 hover:text-[#00685f]"
        >
          <Link href={`/stations/${stationId}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            戻る
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Droplet
            className="h-6 w-6 fill-[#1f8f87] text-[#1f8f87]"
            aria-hidden="true"
          />
          <h1 className="bg-gradient-to-r from-[#0f897f] to-[#1f6fc4] bg-clip-text text-xl font-bold tracking-tight text-transparent">
            緊急連絡フォーム
          </h1>
        </div>
        <p className="mt-1 text-sm text-[#5a6b6a]">給水機 ID: {stationId}</p>
      </header>

      <main className="flex-1 p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-6 rounded-[1.25rem] border border-[#0f897f]/15 bg-white p-5 shadow-sm">
            <section className="flex flex-col gap-3">
              <Label className="text-sm font-semibold text-[#3d4947]">
                不具合の種類
              </Label>
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
              <Label
                htmlFor="message"
                className="text-sm font-semibold text-[#3d4947]"
              >
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
              <Label
                htmlFor="reporter-email"
                className="text-sm font-semibold text-[#3d4947]"
              >
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
              <p className="text-xs text-[#5a6b6a]">
                受付完了メールをお送りします
              </p>
            </section>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-[#0f897f] to-[#1f6fc4] text-white shadow-md shadow-[#1f6fc4]/25 hover:opacity-90"
          >
            {isSubmitting ? '送信中...' : '送信する'}
          </Button>
        </form>
      </main>
    </div>
  );
}
