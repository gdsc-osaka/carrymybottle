# キャリボト Web マップ

阪大キャンパスの給水機マップ Web アプリ。

- **スタック**: Next.js 16 (App Router) + Cloudflare Workers (OpenNext) + Cloudflare D1 + Drizzle ORM
- **詳細仕様**: [`docs/DesignDoc.md`](docs/DesignDoc.md)
- **コントリビューションガイド**: [`AGENTS.md`](AGENTS.md)

---

## ローカル開発環境のセットアップ

### 前提条件

- Node.js 20.9 以上
- pnpm 9 以上
- Wrangler CLI (`pnpm add -g wrangler`)

### 1. 依存関係のインストール

```bash
pnpm install
```

以降のコマンドは `apps/` ディレクトリで実行する。

```bash
cd apps
```

### 2. シークレットの設定

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` を編集し、各シークレットを設定する。

`ADMIN_PASSWORD_HASH` と `ADMIN_PASSWORD_SALT` は以下で生成する。

```bash
pnpm gen-hash
# プロンプトに従いパスワードを入力すると HASH と SALT が出力される
```

`SESSION_SECRET` と `VOTE_TOKEN_SECRET` は任意の 32 文字以上のランダム文字列を設定する。

### 3. データベースのセットアップ

```bash
# マイグレーションをローカル D1 に適用
pnpm db:migrate:local
```

初期データ（キャンパス・建物）の seed 関数は `apps/lib/db/seed/` に定義されている。

### 4. 開発サーバーの起動

```bash
pnpm dev:cf
```

`http://localhost:8787` でアプリが起動する。D1 バインディングおよびシークレットは `.dev.vars` から自動的に読み込まれる。

> **注意**: `pnpm dev`（`next dev`）は Cloudflare Workers ランタイムを使わないため、
> D1 やシークレットにアクセスする機能（管理画面ログイン等）は動作しない。

---

## 主要スクリプト

| コマンド | 内容 |
|---|---|
| `pnpm dev:cf` | Cloudflare Workers ランタイムでローカル起動 |
| `pnpm build:cf` | Cloudflare 向けビルド |
| `pnpm typecheck` | TypeScript 型チェック |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm db:generate` | Drizzle マイグレーションファイル生成 |
| `pnpm db:migrate:local` | ローカル D1 にマイグレーション適用 |
| `pnpm db:migrate:remote` | 本番 D1 にマイグレーション適用 |
| `pnpm gen-hash` | 管理者パスワードハッシュ生成 |

---

## ディレクトリ構成

```
apps/           Next.js アプリケーション
  app/          ルートアダプター（薄いファイルのみ）
  features/     機能別実装
  lib/          共通処理（DB・認証・分析等）
  components/   汎用 UI コンポーネント
docs/           設計ドキュメント
terraform/      Cloudflare インフラ管理（D1・R2）
```
