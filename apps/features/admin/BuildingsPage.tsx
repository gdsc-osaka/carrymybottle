'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BuildingForm } from './BuildingForm';
import type { Building, Campus } from '@/lib/db/types';

interface Props {
  buildings: Building[];
  campuses: Campus[];
}

export function BuildingsPage({ buildings, campuses }: Props) {
  const [open, setOpen] = useState(false);
  const [editBuilding, setEditBuilding] = useState<Building | undefined>();

  const campusName = (id: string) =>
    campuses.find((c) => c.id === id)?.name ?? id;

  function openEdit(building: Building) {
    setEditBuilding(building);
    setOpen(true);
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
            {buildings.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-slate-400"
                >
                  建物がありません
                </TableCell>
              </TableRow>
            )}
            {buildings.map((building) => {
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
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(building)}
                      >
                        編集
                      </Button>
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
