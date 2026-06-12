'use client';

import { useActionState, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  onSuccess?: () => void;
}

export function StationForm({
  campuses,
  buildings,
  station,
  onSuccess,
}: Props) {
  const isEdit = !!station;

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
      temperatures.forEach((t) => formData.append('temperatures', t));

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
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">名称 *</Label>
        <Input id="name" name="name" defaultValue={station?.name} required />
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

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? '保存中...' : isEdit ? '更新する' : '追加する'}
      </Button>
    </form>
  );
}
