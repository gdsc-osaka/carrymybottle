import { describe, it, expect } from 'vitest';
import {
  validateStationImage,
  buildStationImageKey,
  stationImageUrl,
  uploadStationImage,
  deleteStationImage,
  STATION_IMAGE_MAX_BYTES,
} from '../station-images';

function makeFile(type: string, size: number): File {
  // size バイトのダミー内容を持つ File を生成する。
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], 'photo', { type });
}

describe('validateStationImage', () => {
  it('許可された MIME・サイズ内なら null を返す', () => {
    expect(validateStationImage(makeFile('image/jpeg', 1024))).toBeNull();
    expect(validateStationImage(makeFile('image/png', 1024))).toBeNull();
    expect(validateStationImage(makeFile('image/webp', 1024))).toBeNull();
  });

  it('許可されない MIME はエラーを返す', () => {
    expect(validateStationImage(makeFile('image/gif', 1024))).toMatch(/JPEG/);
    expect(validateStationImage(makeFile('application/pdf', 1024))).toMatch(
      /JPEG/
    );
  });

  it('サイズ超過はエラーを返す', () => {
    expect(
      validateStationImage(makeFile('image/jpeg', STATION_IMAGE_MAX_BYTES + 1))
    ).toMatch(/5MB/);
  });
});

describe('buildStationImageKey', () => {
  it('MIME に対応する拡張子で stations/<id>/ 配下のキーを作る', () => {
    const key = buildStationImageKey('station_abc', makeFile('image/webp', 10));
    expect(key).toMatch(/^stations\/station_abc\/[0-9a-f-]+\.webp$/);
  });

  it('jpeg は jpg 拡張子になる', () => {
    const key = buildStationImageKey('s1', makeFile('image/jpeg', 10));
    expect(key.endsWith('.jpg')).toBe(true);
  });
});

describe('stationImageUrl', () => {
  it('ベースURLとキーから配信URLを組み立てる（末尾スラッシュ正規化）', () => {
    expect(stationImageUrl('https://pub-x.r2.dev', 'stations/a/b.jpg')).toBe(
      'https://pub-x.r2.dev/stations/a/b.jpg'
    );
    expect(stationImageUrl('https://pub-x.r2.dev/', 'stations/a/b.jpg')).toBe(
      'https://pub-x.r2.dev/stations/a/b.jpg'
    );
  });

  it('ベースURL未設定 or キー未登録なら null', () => {
    expect(stationImageUrl(undefined, 'k')).toBeNull();
    expect(stationImageUrl('', 'k')).toBeNull();
    expect(stationImageUrl('https://pub-x.r2.dev', null)).toBeNull();
    expect(stationImageUrl('https://pub-x.r2.dev', undefined)).toBeNull();
  });
});

describe('uploadStationImage / deleteStationImage', () => {
  it('put にキーと contentType を渡し、生成キーを返す', async () => {
    const calls: Array<{ key: string; opts: unknown }> = [];
    const bucket = {
      put: async (key: string, _body: unknown, opts: unknown) => {
        calls.push({ key, opts });
      },
      delete: async () => {},
    } as unknown as R2Bucket;

    const file = makeFile('image/png', 10);
    const key = await uploadStationImage(bucket, 'station_z', file);

    expect(key).toMatch(/^stations\/station_z\/.+\.png$/);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.key).toBe(key);
    expect(calls[0]!.opts).toEqual({
      httpMetadata: { contentType: 'image/png' },
    });
  });

  it('delete にキーを渡す', async () => {
    const deleted: string[] = [];
    const bucket = {
      put: async () => {},
      delete: async (key: string) => {
        deleted.push(key);
      },
    } as unknown as R2Bucket;

    await deleteStationImage(bucket, 'stations/a/b.png');
    expect(deleted).toEqual(['stations/a/b.png']);
  });
});
