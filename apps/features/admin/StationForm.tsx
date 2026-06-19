'use client';

import { useActionState, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { stationImageUrl } from '@/lib/storage/station-images';
import { convertImageToWebp } from '@/lib/storage/convert-image-to-webp';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createStationAction, updateStationAction } from './actions';
import { STATUS_LABELS, TEMPERATURE_LABELS } from './validation';
import type { Campus, Building, StationWithRelations } from '@/lib/db/types';

// maplibre-gl is browser-only — load the picker client-side only.
const CoordinatePickerMap = dynamic(() => import('./CoordinatePickerMap'), {
  ssr: false,
  loading: () => <div className="h-64 w-full rounded border bg-muted" />,
});

interface Props {
  campuses: Campus[];
  buildings: Building[];
  station?: StationWithRelations;
  /** 画像の公開配信ベースURL（既存画像プレビュー用）。 */
  imageBaseUrl?: string;
  onSuccess?: () => void;
}

export function StationForm({
  campuses,
  buildings,
  station,
  imageBaseUrl,
  onSuccess,
}: Props) {
  const isEdit = !!station;

  // QR / 短縮リンクの遷移先として url.gdgs.jp に設定すべき正規URL。
  // 計測には ?source=qr が必須なので、コピペ用に組み立てて表示する。
  // origin は配信元（公開サイト）と同一なので window から取得する。編集ダイアログは
  // クリック後にクライアントでマウントされるため、遅延初期化で SSR を避ける。
  const [origin] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : ''
  );
  const qrTargetUrl =
    station && origin ? `${origin}/stations/${station.id}?source=qr` : '';
  const [qrUrlCopied, setQrUrlCopied] = useState(false);
  const handleCopyQrUrl = useCallback(async () => {
    if (!qrTargetUrl) return;
    try {
      await navigator.clipboard.writeText(qrTargetUrl);
      setQrUrlCopied(true);
      setTimeout(() => setQrUrlCopied(false), 2000);
    } catch {
      // クリップボード API が使えない環境では何もしない（手動コピー可能）。
    }
  }, [qrTargetUrl]);

  const existingImageUrl = stationImageUrl(imageBaseUrl, station?.imageKey);
  const [removeImage, setRemoveImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 選択中ファイルの object URL はアンマウント時に解放する（リーク防止）。
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleImageChange(file: File | null) {
    // 直前のプレビューURLを解放してから新しいものに差し替える。
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    if (file) setRemoveImage(false);
  }

  const [campusId, setCampusId] = useState(station?.campusId ?? '');
  const [buildingId, setBuildingId] = useState(station?.buildingId ?? '');
  const [latitude, setLatitude] = useState<number | null>(
    station?.latitude ?? null
  );
  const [longitude, setLongitude] = useState<number | null>(
    station?.longitude ?? null
  );
  const [temperatures, setTemperatures] = useState<string[]>(
    station?.temperatures.map((t) => t.temperatureType) ?? []
  );

  const filteredBuildings = buildings.filter((b) => b.campusId === campusId);

  const handleCoordinate = useCallback((lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  }, []);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      formData.set('latitude', latitude == null ? '' : String(latitude));
      formData.set('longitude', longitude == null ? '' : String(longitude));
      formData.set('removeImage', String(removeImage));
      temperatures.forEach((t) => formData.append('temperatures', t));

      // JPEG / PNG はアップロード前にクライアント側で WebP へ変換・縮小する。
      // 変換対象外・失敗時は元ファイルのまま送られる（フォールバック）。
      const rawImage = formData.get('image');
      if (rawImage instanceof File && rawImage.size > 0) {
        formData.set('image', await convertImageToWebp(rawImage));
      }

      const result = isEdit
        ? await updateStationAction(station.id, formData)
        : await createStationAction(formData);

      if (!result.success) return { error: result.error };
      onSuccess?.();
      return null;
    },
    null
  );

  function toggleTemp(value: string) {
    setTemperatures((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* PC: 2カラム / モバイル: 1カラム縦並び */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {/* 左カラム: 基本情報 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称 *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={station?.name}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>キャンパス *</Label>
              <Select
                name="campusId"
                value={campusId}
                onValueChange={(v) => {
                  setCampusId(v);
                  setBuildingId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>建物 *</Label>
              <Select
                name="buildingId"
                value={buildingId}
                onValueChange={setBuildingId}
                disabled={!campusId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {filteredBuildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>ステータス *</Label>
            <Select name="status" defaultValue={station?.status ?? 'available'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>水温種別 *（複数選択可）</Label>
            <div className="flex gap-4">
              {Object.entries(TEMPERATURE_LABELS).map(([value, label]) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={`temp-${value}`}
                    checked={temperatures.includes(value)}
                    onCheckedChange={() => toggleTemp(value)}
                  />
                  <Label htmlFor={`temp-${value}`} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={station?.description ?? ''}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">画像</Label>

            {/* 新規選択のプレビュー（優先表示） */}
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="選択中の画像プレビュー"
                className="h-32 w-full rounded border object-cover"
              />
            ) : existingImageUrl && !removeImage ? (
              // 既存画像のプレビュー
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={existingImageUrl}
                alt="現在の画像"
                className="h-32 w-full rounded border object-cover"
              />
            ) : null}

            {removeImage && !previewUrl ? (
              <p className="text-sm text-muted-foreground">
                画像を削除します。
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => setRemoveImage(false)}
                >
                  取り消す
                </button>
              </p>
            ) : null}

            <Input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              JPEG / PNG / WebP・5MBまで（JPEG・PNG は自動で WebP
              に変換・縮小されます）
            </p>

            {isEdit && existingImageUrl && !removeImage && !previewUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRemoveImage(true)}
              >
                画像を削除
              </Button>
            ) : null}
          </div>
        </div>

        {/* 右カラム: 座標・短縮リンク・公開設定 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>座標 *（地図クリックで設定）</Label>
            <CoordinatePickerMap
              campusId={campusId}
              latitude={latitude}
              longitude={longitude}
              onChange={handleCoordinate}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="latitude" className="text-xs">
                  緯度 (latitude)
                </Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  value={latitude ?? ''}
                  onChange={(e) =>
                    setLatitude(
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="longitude" className="text-xs">
                  経度 (longitude)
                </Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  value={longitude ?? ''}
                  onChange={(e) =>
                    setLongitude(
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>
          </div>

          {isEdit && station && (
            <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
              <Label className="text-sm font-semibold text-teal-800">
                QR / 短縮リンク用URL
              </Label>
              <p className="text-xs leading-relaxed text-slate-600">
                url.gdgs.jp にてこのURLを用いて短縮リンクを生成してください。
                <code className="mx-0.5 rounded bg-slate-100 px-1 py-0.5">
                  ?source=qr
                </code>
                が付いた状態でアクセスされることで、分析（QRスキャン数・閲覧数）に計上されます。
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={qrTargetUrl}
                  aria-label="QR / 短縮リンク用URL"
                  className="font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyQrUrl}
                  disabled={!qrTargetUrl}
                  className="shrink-0"
                >
                  {qrUrlCopied ? 'コピーしました' : 'コピー'}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="shortLinkId">短縮リンクID (url.gdgs.jp)</Label>
            <Input
              id="shortLinkId"
              name="shortLinkId"
              defaultValue={station?.shortLinkId ?? ''}
              placeholder="例: abc123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortLinkUrl">短縮リンクURL</Label>
            <Input
              id="shortLinkUrl"
              name="shortLinkUrl"
              type="url"
              defaultValue={station?.shortLinkUrl ?? ''}
              placeholder="https://url.gdgs.jp/..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isPublic"
              name="isPublic"
              value="true"
              defaultChecked={station?.isPublic ?? true}
            />
            <Label htmlFor="isPublic" className="font-normal">
              公開する
            </Label>
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? '保存中...' : isEdit ? '更新する' : '追加する'}
        </Button>
      </div>
    </form>
  );
}
