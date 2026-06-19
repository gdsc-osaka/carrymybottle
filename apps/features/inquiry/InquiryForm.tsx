'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  INQUIRY_CATEGORIES,
  INQUIRY_CATEGORY_LABELS,
  type InquiryCategory,
} from '@/lib/constants/inquiries';
import { submitInquiryAction } from './actions';

/**
 * LP のお問い合わせセクションに埋め込むフォーム。
 * 種別・本文・連絡先メール（+任意で氏名）を `submitInquiryAction` に送信し、
 * 送信中 / 成功 / 失敗の状態を表示する。緊急連絡フォームの UX を踏襲。
 */
export function InquiryForm() {
  const [category, setCategory] = useState<InquiryCategory | ''>('');
  const [name, setName] = useState('');
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
    formData.set('category', category);
    formData.set('name', name);
    formData.set('message', message);
    formData.set('reporterEmail', reporterEmail);

    const result = await submitInquiryAction(formData);
    if (result.success) {
      setIsSubmitted(true);
    } else {
      setErrorMessage(result.error);
    }
    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <div className="lp-glass-card flex flex-col items-center gap-4 rounded-[1.5rem] p-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0f897f] to-[#1f6fc4] text-white shadow-lg shadow-[#1f6fc4]/25">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </span>
        <p className="text-lg font-bold text-[#191c1e]">送信が完了しました</p>
        <p className="max-w-xs text-sm leading-relaxed text-[#46595a]">
          お問い合わせありがとうございます。確認次第対応いたします。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="lp-glass-card flex flex-col gap-6 rounded-[1.5rem] p-6 sm:p-8">
        <section className="flex flex-col gap-3">
          <Label className="text-sm font-semibold text-[#3d4947]">
            お問い合わせの種別
          </Label>
          <RadioGroup
            value={category}
            onValueChange={(v) => setCategory(v as InquiryCategory)}
            required
          >
            {INQUIRY_CATEGORIES.map((type) => (
              <div key={type} className="flex items-center gap-3">
                <RadioGroupItem value={type} id={`inquiry-category-${type}`} />
                <Label
                  htmlFor={`inquiry-category-${type}`}
                  className="cursor-pointer font-normal"
                >
                  {INQUIRY_CATEGORY_LABELS[type]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </section>

        <section className="flex flex-col gap-2">
          <Label
            htmlFor="inquiry-name"
            className="text-sm font-semibold text-[#3d4947]"
          >
            お名前
            <span className="ml-1 font-normal text-[#5a6b6a]">（任意）</span>
          </Label>
          <Input
            id="inquiry-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田 太郎"
            maxLength={100}
            autoComplete="name"
          />
        </section>

        <section className="flex flex-col gap-2">
          <Label
            htmlFor="inquiry-message"
            className="text-sm font-semibold text-[#3d4947]"
          >
            お問い合わせ内容
          </Label>
          <Textarea
            id="inquiry-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="お問い合わせ内容をご記入ください"
            required
            maxLength={2000}
            rows={5}
          />
        </section>

        <section className="flex flex-col gap-2">
          <Label
            htmlFor="inquiry-email"
            className="text-sm font-semibold text-[#3d4947]"
          >
            連絡先メールアドレス
          </Label>
          <Input
            id="inquiry-email"
            type="email"
            value={reporterEmail}
            onChange={(e) => setReporterEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
          <p className="text-xs text-[#5a6b6a]">ご返信のためにご記入ください</p>
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
        className="h-12 w-full bg-gradient-to-r from-[#0f897f] to-[#1f6fc4] text-base text-white shadow-md shadow-[#1f6fc4]/25 hover:opacity-90"
      >
        {isSubmitting ? '送信中...' : '送信する'}
      </Button>
    </form>
  );
}
