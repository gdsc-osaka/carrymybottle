import { z } from 'zod';

export const loginSchema = z.object({
  password: z.string().min(1, 'パスワードを入力してください'),
});

export const stationSchema = z.object({
  name: z.string().min(1, '名称を入力してください'),
  campusId: z.string().min(1, 'キャンパスを選択してください'),
  buildingId: z.string().min(1, '建物を選択してください'),
  status: z.enum(['available', 'stopped', 'broken']),
  temperatures: z
    .array(z.enum(['cold', 'normal', 'hot']))
    .min(1, '水温種別を1つ以上選択してください')
    .refine((v) => new Set(v).size === v.length, '水温種別は重複できません'),
  description: z.string().optional(),
  latitude: z
    .number({ message: '緯度を入力してください' })
    .min(-90, '緯度は -90〜90 の範囲で入力してください')
    .max(90, '緯度は -90〜90 の範囲で入力してください'),
  longitude: z
    .number({ message: '経度を入力してください' })
    .min(-180, '経度は -180〜180 の範囲で入力してください')
    .max(180, '経度は -180〜180 の範囲で入力してください'),
  isPublic: z.boolean(),
  shortLinkId: z.string().optional(),
  shortLinkUrl: z
    .string()
    .url('有効なURLを入力してください')
    .optional()
    .or(z.literal('')),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type StationInput = z.infer<typeof stationSchema>;

export const STATUS_LABELS: Record<string, string> = {
  available: '利用可能',
  stopped: '停止中',
  broken: '故障中',
};

export const TEMPERATURE_LABELS: Record<string, string> = {
  cold: '冷水',
  normal: '常温水',
  hot: '温水',
};

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  broken: '故障',
  stopped: '停止中',
  no_water: '水が出ない',
  leak_or_abnormal: '水漏れ・異常',
  other: 'その他',
};
