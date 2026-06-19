-- 給水機の短縮リンク（gdgs.jp）登録（#188）。冪等（再実行しても安全）。
-- 短縮リンク本体と QR コードは GDG 側で作成済み。本スクリプトはアプリ DB の
-- stations.short_link_id / short_link_url に登録（紐付け）するためのもの。
--
-- 実行（本番）:
--   wrangler d1 execute DB --env=production --remote --file=lib/db/seed/short_links.sql
-- 実行（ローカル検証）:
--   wrangler d1 execute DB --local --file=lib/db/seed/short_links.sql
--
-- 注意:
-- - 遷移先（給水機詳細 /stations/[id]?source=qr&station_id=[id]）は gdgs.jp 側で設定済み。
--   本スクリプトは遷移先を変更しない（アプリ側は ID/URL の保持・表示のみ）。
-- - 該当 ID の給水機が存在しない場合、その UPDATE は 0 行更新（no-op）で安全。
-- - LP 用リンク（https://gdgs.jp/carrymybottle）は給水機ではないため対象外。

-- 福利会館（生協コンビニ） -----------------------------------------------------
UPDATE stations
SET short_link_id  = 'cmb-fukuri',
    short_link_url = 'https://gdgs.jp/cmb-fukuri',
    updated_at     = strftime('%s','now')
WHERE id = 'toyonaka_fukuri_coop';

-- 全学A棟（全学教育推進機構 管理・講義A棟 / ピロティ正面） ---------------------
UPDATE stations
SET short_link_id  = 'cmb-zengaku-a',
    short_link_url = 'https://gdgs.jp/cmb-zengaku-a',
    updated_at     = strftime('%s','now')
WHERE id = 'toyonaka_zengaku_a';

-- M3棟（212講義室前） ---------------------------------------------------------
UPDATE stations
SET short_link_id  = 'cmb-m3',
    short_link_url = 'https://gdgs.jp/cmb-m3',
    updated_at     = strftime('%s','now')
WHERE id = 'suita_m3_212';

-- 本部前コンビニ（生協コンビニ本部前店） --------------------------------------
UPDATE stations
SET short_link_id  = 'cmb-honbumae',
    short_link_url = 'https://gdgs.jp/cmb-honbumae',
    updated_at     = strftime('%s','now')
WHERE id = 'suita_coop_honbumae';
