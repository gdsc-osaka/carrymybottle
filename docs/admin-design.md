# Admin 機能 実装仕様書

## 概要

キャリボト管理者向けの管理画面を実装する。
対応 GitHub issue: [#10 \[Feature\] Admin（管理画面）](https://github.com/gdsc-osaka/carrymybottle/issues/10)

---

## 対象ルートと issue 対応表

| ルート | issue | 内容 |
|---|---|---|
| `src/lib/db/schema.ts` | #80 | admin_audit_events テーブル定義 |
| `scripts/gen-hash.ts` | #81 | PBKDF2-SHA256 ハッシュ生成スクリプト |
| `src/lib/auth/session.ts` | #82 | 署名付き Cookie 発行・検証 |
| `src/lib/auth/session.ts` | #83 | requireAdminSession() Server Actions ガード |
| `/admin/login` | #84 | ログインページ |
| `src/app/admin/layout.tsx` | #85 | Server Component セッション検証 + redirect |
| `/admin` | #86 | 管理画面トップ |
| `/admin/stations` | #87 | 給水機一覧ページ |
| `/admin/stations` | #88 | 給水機追加・編集フォーム |
| `/admin/stations` | #89 | ビジュアル座標エディタ |
| `/admin/stations` | #90 | 給水機非公開化・削除 |
| `/admin/requests` | #91 | 設置希望コメント閲覧・削除 |
| `/admin/contacts` | #92 | 緊急連絡閲覧・削除 |
| `/admin/stations` | #93 | 短縮リンク管理 UI |
| `/admin` (任意) | #94 | ログアウト機能 |

---

## ディレクトリ構成

DesignDoc §2.4 に従い、`apps/` を `src/` 相当として扱う。

```
apps/
  app/
    admin/
      layout.tsx          # #85: Server Component セッション検証
      page.tsx            # #86: AdminDashboardPage を呼ぶ薄いラッパー
      login/
        page.tsx          # #84: ログインページ
      stations/
        page.tsx          # #87 #88 #89 #90 #93: 給水機管理
      requests/
        page.tsx          # #91: 設置希望管理
      contacts/
        page.tsx          # #92: 緊急連絡管理
  features/
    admin/
      AdminDashboardPage.tsx
      StationsPage.tsx
      RequestsPage.tsx
      ContactsPage.tsx
      actions.ts          # Server Actions（requireAdminSession() 必須）
      queries.ts
      validation.ts       # Zod スキーマ
  lib/
    auth/
      session.ts          # #82 #83
    db/
      schema.ts           # #80 admin_audit_events テーブル追加
scripts/
  gen-hash.ts             # #81
```

---

## 実装詳細

### #80 admin_audit_events テーブル定義

`apps/lib/db/schema.ts` に追加する Drizzle テーブル定義。

```ts
export const adminAuditEvents = sqliteTable("admin_audit_events", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

- MVP では詳細な監査ログは対象外だが、基本ログを残せる構成にする
- 共有パスワード方式のため個人識別はできない（将来の個別アカウント移行後に強化）
- テーブル定義後、Drizzle Kit で migration を生成する

---

### #81 PBKDF2-SHA256 ハッシュ生成スクリプト

`scripts/gen-hash.ts` に実装する。

**目的**: 管理者パスワードの `ADMIN_PASSWORD_HASH` と `ADMIN_PASSWORD_SALT` を生成し、`wrangler secret` で登録する。

**実装内容**:
- ランダムな salt を生成する（`crypto.getRandomValues`）
- 入力パスワードを PBKDF2-SHA256 でハッシュ化する
- hash と salt を Base64 で出力する

**使い方**:
```bash
npx ts-node scripts/gen-hash.ts
# => ADMIN_PASSWORD_HASH=xxx
# => ADMIN_PASSWORD_SALT=yyy
```

その後、以下で環境変数を登録する:
```bash
wrangler secret put ADMIN_PASSWORD_HASH
wrangler secret put ADMIN_PASSWORD_SALT
wrangler secret put SESSION_SECRET
```

---

### #82 src/lib/auth/session.ts（Cookie 発行・検証）

**署名方式**: `SESSION_SECRET` を使った HMAC-SHA256 署名付き Cookie。

**発行 (`createSession`)**:
1. セッションペイロード（`{ role: "admin", iat: timestamp }`）を JSON 化
2. `SESSION_SECRET` で HMAC-SHA256 署名
3. `payload.signature` の形式で Cookie にセット

**Cookie 属性**:
- `HttpOnly`: true
- `Secure`: true（本番）
- `SameSite`: `Lax`
- `Max-Age`: 24時間（86400秒）
- Cookie 名: `admin_session`

**検証 (`verifySession`)**:
1. Cookie から値を取得
2. HMAC-SHA256 で署名を検証（定数時間比較）
3. 有効期限を確認
4. 検証失敗時は `null` を返す

```ts
// apps/lib/auth/session.ts
export async function createSession(env: Env): Promise<string>
export async function verifySession(cookieValue: string, env: Env): Promise<boolean>
export async function deleteSession(): Promise<void>
```

---

### #83 requireAdminSession()

admin Server Actions の先頭で必ず呼ぶガード関数。

```ts
// apps/lib/auth/session.ts に追加
export async function requireAdminSession(env: Env): Promise<void> {
  const cookie = await cookies();
  const sessionValue = cookie.get("admin_session")?.value;
  if (!sessionValue || !(await verifySession(sessionValue, env))) {
    throw new Error("Unauthorized");
  }
}
```

- 未認証の場合は Error をスローして Server Action を中断する
- ページ側の保護（layout.tsx の redirect）と Server Action 側の保護の両方を行う

---

### #84 /admin/login ログインページ

**ファイル**: `apps/app/admin/login/page.tsx`  
**Feature コンポーネント**: `apps/features/admin/LoginPage.tsx`

**UI**:
- パスワード入力フォーム（`<input type="password">`）
- 送信ボタン
- エラー表示（認証失敗時）

**Server Action（`apps/features/admin/actions.ts`）**:
```
loginAction(formData: FormData):
  1. パスワードを取得
  2. ADMIN_PASSWORD_SALT で PBKDF2-SHA256 ハッシュ化
  3. ADMIN_PASSWORD_HASH と定数時間比較（crypto.timingSafeEqual 相当）
  4. 一致 → createSession() → /admin にリダイレクト
  5. 不一致 → エラーメッセージを返す
```

**レート制限**: 管理画面ログイン試行にも簡易レート制限を適用する（DesignDoc §8.3）。

---

### #85 src/app/admin/layout.tsx

Server Component として実装する。

```tsx
// apps/app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const cookie = await cookies();
  const session = cookie.get("admin_session")?.value;
  const valid = session && await verifySession(session, env);
  if (!valid) {
    redirect("/admin/login");
  }
  return (
    <div>
      <AdminNav />   {/* ナビゲーション */}
      {children}
    </div>
  );
}
```

**重要**:
- `/admin/login` はこの layout の保護対象外にする
  - `apps/app/admin/login/layout.tsx` または login を layout の外に置く
  - または login ページだけセッション検証をスキップする条件分岐
- Client Component の `useEffect` で認証判定しない（フリッカー防止）
- 未認証時はサーバー側で `redirect("/admin/login")`

**AdminNav に含めるリンク**:
- 管理画面トップ（`/admin`）
- 給水機管理（`/admin/stations`）
- 設置希望管理（`/admin/requests`）
- 緊急連絡管理（`/admin/contacts`）
- ログアウトボタン（#94）

---

### #86 AdminDashboardPage.tsx 管理画面トップ

**ファイル**: `apps/features/admin/AdminDashboardPage.tsx`

**表示内容**:
- 各管理ページへのナビゲーションカード
  - 給水機管理（件数表示）
  - 設置希望管理（未確認コメント数）
  - 緊急連絡管理（未確認件数）
- 簡易サマリ（給水機数、設置希望数、緊急連絡数）

---

### #87 給水機一覧ページ（/admin/stations）

**ファイル**: `apps/features/admin/StationsPage.tsx`

**表示項目**（テーブル形式）:
| 列 | 内容 |
|---|---|
| ID | station_id |
| 名称 | name |
| キャンパス | campus_id |
| 建物 | building_id |
| 状態 | status（available/stopped/broken） |
| 水温 | temperature types |
| 公開 | is_public |
| 操作 | 編集・非公開化・削除 |

**query**（`apps/features/admin/queries.ts`）:
```ts
getAllStations(db: DrizzleD1): Promise<StationWithRelations[]>
```

- `stations` + `campuses` + `buildings` + `station_temperatures` を JOIN
- is_public に関わらず全件取得する（管理画面なので非公開も表示）

---

### #88 給水機追加・編集フォーム

**UI**（Dialog または別ページ）:
| 項目 | 入力方法 |
|---|---|
| 名称 | テキスト入力（必須） |
| キャンパス | セレクト（campuses テーブルから取得） |
| 建物 | セレクト（選択キャンパスに紐づく buildings） |
| 状態 | セレクト（available/stopped/broken） |
| 水温種別 | チェックボックス複数選択（cold/normal/hot） |
| 説明 | テキストエリア（任意） |
| 相対座標 X | 数値入力（0.0〜1.0）※ビジュアルエディタと連動 |
| 相対座標 Y | 数値入力（0.0〜1.0）※ビジュアルエディタと連動 |
| is_public | チェックボックス |

**Validation**（`apps/features/admin/validation.ts`）:
```ts
const stationFormSchema = z.object({
  name: z.string().min(1),
  campusId: z.string().min(1),
  buildingId: z.string().min(1),
  status: z.enum(["available", "stopped", "broken"]),
  temperatures: z.array(z.enum(["cold", "normal", "hot"])).min(1),
  description: z.string().optional(),
  relativeX: z.number().min(0).max(1),
  relativeY: z.number().min(0).max(1),
  isPublic: z.boolean(),
});
```

**Server Actions**:
```ts
createStationAction(formData: FormData): Promise<ActionResult>
updateStationAction(stationId: string, formData: FormData): Promise<ActionResult>
```

- 先頭で `requireAdminSession()` を呼ぶ
- `stations` テーブルへ INSERT または UPDATE
- `station_temperatures` テーブルを全削除 → 再 INSERT（水温種別の更新）
- `admin_audit_events` にログを記録

---

### #89 ビジュアル座標エディタ

**目的**: 地図画像上をクリックして `relative_x` / `relative_y` を直感的に設定する。

**実装方針**:
- 地図画像をコンテナに表示する
- コンテナ上のクリックイベントで座標を計算する
  ```ts
  const relativeX = clickX / containerWidth;
  const relativeY = clickY / containerHeight;
  ```
- 計算した値を #88 フォームの X・Y 入力フィールドに反映する
- クリック位置にピンを表示してフィードバックする

**MVP 境界**:
- クリックによる座標設定は必須
- ピンのドラッグ調整は MVP 必須ではない
- キャンパス選択で対応する地図画像を切り替える

**コンポーネント**: `VisualCoordinateEditor` （Client Component）

---

### #90 給水機非公開化・削除

**非公開化**（QR コードと紐づいた給水機の推奨操作）:
```ts
unpublishStationAction(stationId: string): Promise<ActionResult>
// stations テーブルの is_public = 0 に更新
```

**物理削除**:
```ts
deleteStationAction(stationId: string): Promise<ActionResult>
// stations テーブルから物理削除
// station_temperatures も CASCADE または手動で削除
```

**UI**:
- 給水機一覧（#87）の各行に「非公開化」「削除」ボタンを配置
- 削除前に確認ダイアログ（`AlertDialog`）を表示する
- QR コードと紐づいている場合（`short_link_url` が設定済み）は、削除より非公開化を推奨する警告を表示する

---

### #91 設置希望コメント閲覧・削除（/admin/requests）

**ファイル**: `apps/features/admin/RequestsPage.tsx`

**表示内容**:
- キャンパスフィルタ
- 建物ごとの設置希望リスト（installation_targets）
  - 建物名、投票数
  - 紐づくコメント一覧（installation_comments、`deleted_at IS NULL`）
  - コメントごとに「削除」ボタン

**削除 Server Action**:
```ts
deleteInstallationCommentAction(commentId: string): Promise<ActionResult>
// deleted_at = NOW() に更新（論理削除）
```

**query**:
```ts
getInstallationTargetsWithComments(db, campusId?: string): Promise<TargetWithComments[]>
```

---

### #92 緊急連絡閲覧・削除（/admin/contacts）

**ファイル**: `apps/features/admin/ContactsPage.tsx`

**表示内容**（テーブル形式）:
| 列 | 内容 |
|---|---|
| 日時 | created_at |
| 給水機 | station_id（名称も表示） |
| 種別 | issue_type |
| 内容 | message |
| 連絡者 | reporter_email |
| 管理者通知 | admin_email_sent_at |
| 自動返信 | auto_reply_sent_at / auto_reply_error |
| 操作 | 削除 |

- `auto_reply_error` が設定されている場合は警告アイコンを表示する
- フィルタ: issue_type、日付範囲

**削除 Server Action**:
```ts
deleteEmergencyContactAction(contactId: string): Promise<ActionResult>
// deleted_at = NOW() に更新（論理削除）
```

---

### #93 短縮リンク管理 UI

**場所**: 給水機一覧（#87）または給水機編集フォーム（#88）に統合する。

**表示・編集項目**:
| 項目 | 内容 |
|---|---|
| short_link_id | url.gdgs.jp 側の識別子 |
| short_link_url | 完全な短縮リンク URL（例: `https://url.gdgs.jp/xxxxx`） |

**Server Action**:
```ts
updateShortLinkAction(stationId: string, shortLinkId: string, shortLinkUrl: string): Promise<ActionResult>
```

**運用フロー**（仕様書 §11.2 より）:
1. 給水機データを作成する
2. station_id を確定する
3. `url.gdgs.jp` で短縮リンクを手動作成する（MVP では管理画面外の作業）
4. 管理画面から `short_link_id` と `short_link_url` を登録する

---

### #94 ログアウト機能

**実装場所**: AdminNav（#85 layout に含まれるナビゲーション）

**Server Action**:
```ts
logoutAction(): Promise<never>
// 1. requireAdminSession() で認証確認
// 2. Cookie "admin_session" を削除
// 3. redirect("/admin/login")
```

**UI**: AdminNav にログアウトボタンを配置する。フォームの submit で Server Action を呼ぶ（`<form action={logoutAction}>`）。

---

## 未インストールの依存パッケージ

現在の `package.json` に以下が不足している。実装前に追加が必要。

```bash
pnpm add drizzle-orm @cloudflare/workers-types
pnpm add zod
pnpm add -D drizzle-kit wrangler
```

---

## 環境変数

DesignDoc §13.4 より、admin に関係する環境変数:

| 変数名 | 説明 | 登録方法 |
|---|---|---|
| `ADMIN_PASSWORD_HASH` | PBKDF2-SHA256 ハッシュ | `wrangler secret put` |
| `ADMIN_PASSWORD_SALT` | ハッシュ用 salt | `wrangler secret put` |
| `SESSION_SECRET` | Cookie 署名用シークレット | `wrangler secret put` |

ローカル開発では `.dev.vars` に記載する（`.gitignore` 済みを確認すること）。

---

## 実装順序（推奨）

依存関係に基づく推奨実装順:

1. **#80** DB スキーマ（admin_audit_events）
2. **#81** ハッシュ生成スクリプト + 環境変数セットアップ
3. **#82** session.ts（Cookie 発行・検証）
4. **#83** requireAdminSession()
5. **#84** ログインページ
6. **#85** admin layout.tsx（セッション検証 + redirect）
7. **#86** AdminDashboardPage（トップ）
8. **#87** 給水機一覧ページ
9. **#88** 給水機追加・編集フォーム
10. **#89** ビジュアル座標エディタ（#88 に統合）
11. **#90** 非公開化・削除（#87 に統合）
12. **#93** 短縮リンク管理 UI（#88 に統合）
13. **#91** 設置希望コメント管理
14. **#92** 緊急連絡管理
15. **#94** ログアウト（#85 layout に統合）

---

## セキュリティ考慮事項

- パスワードの平文を環境変数に保存しない（#81 のスクリプトで hash + salt を生成）
- PBKDF2 検証は定数時間比較（`crypto.timingSafeEqual` 相当）を使う
- Server Actions は必ず `requireAdminSession()` をガードとして呼ぶ（UI 非表示だけに依存しない）
- Cookie は `HttpOnly`, `Secure`, `SameSite=Lax` を設定する
- レート制限: ログイン試行・設置希望投票・緊急連絡送信に適用する（DesignDoc §8.3）

---

## 参照

- DesignDoc §4.12（admin_audit_events）
- DesignDoc §9（Admin Console and Authentication）
- DesignDoc §11.2（Short Link Management）
- PRD FR-012（Admin Console 要件）
