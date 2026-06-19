'use client';

import { useActionState, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateBuildingAction } from './actions';
import type { Building, Campus } from '@/lib/db/types';

// maplibre-gl is browser-only — load the picker client-side only.
const CoordinatePickerMap = dynamic(() => import('./CoordinatePickerMap'), {
  ssr: false,
  loading: () => <div className="h-64 w-full rounded border bg-muted" />,
});

interface Props {
  building: Building;
  campus?: Campus;
  onSuccess?: () => void;
}

/**
 * 建物の編集フォーム。座標補正が主目的のため、給水機の {@link StationForm} と同じ
 * {@link CoordinatePickerMap}（地図クリック / マーカードラッグ）を再利用する。
 * 緯度・経度は任意で、「座標をクリア」で未設定（null）に戻せる。
 */
export function BuildingForm({ building, campus, onSuccess }: Props) {
  const [latitude, setLatitude] = useState<number | null>(
    building.latitude ?? null
  );
  const [longitude, setLongitude] = useState<number | null>(
    building.longitude ?? null
  );

  const handleCoordinate = useCallback((lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  }, []);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      formData.set('latitude', latitude == null ? '' : String(latitude));
      formData.set('longitude', longitude == null ? '' : String(longitude));

      const result = await updateBuildingAction(building.id, formData);
      if (!result.success) return { error: result.error };
      onSuccess?.();
      return null;
    },
    null
  );

  const hasCoord = latitude != null || longitude != null;

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {/* 左カラム: 基本情報 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>キャンパス</Label>
            <Input
              value={campus?.name ?? building.campusId}
              disabled
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">建物名 *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={building.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">並び順</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              step="1"
              min="0"
              defaultValue={building.sortOrder}
            />
          </div>
        </div>

        {/* 右カラム: 座標 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>座標（地図クリックで設定）</Label>
            <CoordinatePickerMap
              campusId={building.campusId}
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
            {hasCoord && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  setLatitude(null);
                  setLongitude(null);
                }}
              >
                座標をクリア（未設定にする）
              </Button>
            )}
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? '保存中...' : '更新する'}
        </Button>
      </div>
    </form>
  );
}
