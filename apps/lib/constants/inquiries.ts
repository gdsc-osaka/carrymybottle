export const INQUIRY_CATEGORIES = [
  'general',
  'installation_request',
  'feedback',
  'other',
] as const;

export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

export const INQUIRY_CATEGORY_LABELS: Record<InquiryCategory, string> = {
  general: '一般的なお問い合わせ',
  installation_request: '設置リクエスト',
  feedback: 'フィードバック',
  other: 'その他',
};
