'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BuildingForm } from './BuildingForm';
import { deleteBuildingAction } from './actions';
import type { Building, Campus } from '@/lib/db/types';

type CoordFilter = 'all' | 'set' | 'unset';

interface Props {
  buildings: Building[];
  campuses: Campus[];
}

export function BuildingsPage({ buildings, campuses }: Props) {
  const [open, setOpen] = useState(false);
  const [editBuilding, setEditBuilding] = useState<Building | undefined>();

  const [query, setQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [coordFilter, setCoordFilter] = useState<CoordFilter>('all');

  const campusName = (id: string) =>
    campuses.find((c) => c.id === id)?.name ?? id;

  // 名前の部分一致・キャンパス・座標設定状況でクライアント側に絞り込む。
  const filteredBuildings = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return buildings.filter((building) => {
      if (normalized && !building.name.toLowerCase().includes(normalized)) {
        return false;
      }
      if (campusFilter !== 'all' && building.campusId !== campusFilter) {
        return false;
      }
      if (coordFilter !== 'all') {
        const hasCoord =
          building.latitude != null && building.longitude != null;
        if (coordFilter === 'set' && !hasCoord) return false;
        if (coordFilter === 'unset' && hasCoord) return false;
      }
      return true;
    });
  }, [buildings, query, campusFilter, coordFilter]);

  // 削除は「依存あり」など想定内の失敗を理由つきで表示したいので、結果の
  // { success:false, error } を拾う専用ハンドラで扱う（throw も保険で捕捉）。
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openEdit(building: Building) {
    setEditBuilding(building);
    setOpen(true);
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setError(null);
    setDeletingId(id);
    try {
      const result = await deleteBuildingAction(id);
      if (!result.success) setError(result.error);
    } catch {
      setError('削除に失敗しました。時間をおいて再試行してください。');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">建物管理</h1>
        <p className="text-sm text-slate-500">
          登録済みの建物 {buildings.length}{' '}
          件。座標は地図の設置希望投票（近接建物の抽出）に使われます。
        </p>
      </div>

      {/* 検索・フィルタ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="建物名で検索"
            className="pl-9"
            aria-label="建物名で検索"
          />
        </div>

        <Select value={campusFilter} onValueChange={setCampusFilter}>
          <SelectTrigger className="sm:w-44" aria-label="キャンパスで絞り込み">
            <SelectValue placeholder="キャンパス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのキャンパス</SelectItem>
            {campuses.map((campus) => (
              <SelectItem key={campus.id} value={campus.id}>
                {campus.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={coordFilter}
          onValueChange={(value) => setCoordFilter(value as CoordFilter)}
        >
          <SelectTrigger className="sm:w-36" aria-label="座標で絞り込み">
            <SelectValue placeholder="座標" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">座標：すべて</SelectItem>
            <SelectItem value="set">座標：設定済み</SelectItem>
            <SelectItem value="unset">座標：未設定</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-slate-500">
        {filteredBuildings.length} 件を表示（全 {buildings.length} 件）
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">
                建物名
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                キャンパス
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                座標（緯度, 経度）
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBuildings.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-slate-400"
                >
                  {buildings.length === 0
                    ? '建物がありません'
                    : '条件に一致する建物がありません'}
                </TableCell>
              </TableRow>
            )}
            {filteredBuildings.map((building) => {
              const hasCoord =
                building.latitude != null && building.longitude != null;
              return (
                <TableRow key={building.id} className="hover:bg-teal-50/40">
                  <TableCell className="font-medium text-slate-900">
                    {building.name}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {campusName(building.campusId)}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {hasCoord ? (
                      <span className="font-mono text-xs">
                        {building.latitude!.toFixed(6)},{' '}
                        {building.longitude!.toFixed(6)}
                      </span>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-700"
                      >
                        未設定
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(building)}
                      >
                        編集
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            削除
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              本当に削除しますか？
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              「{building.name}
                              」を完全に削除します。この操作は取り消せません。給水機や設置希望から参照されている建物は削除できません。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deletingId === building.id}
                              onClick={() => handleDelete(building.id)}
                            >
                              {deletingId === building.id
                                ? '削除中...'
                                : '削除する'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto md:max-w-4xl">
          <DialogHeader>
            <DialogTitle>建物を編集</DialogTitle>
          </DialogHeader>
          {editBuilding && (
            <BuildingForm
              building={editBuilding}
              campus={campuses.find((c) => c.id === editBuilding.campusId)}
              onSuccess={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
