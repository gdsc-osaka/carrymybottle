# Terraform

Cloudflare リソースを Terraform で管理する。

## 管理方針

Terraform は Cloudflare リソースのライフサイクル管理を担当する。OpenNext for Cloudflare の Worker 実行設定や bindings は `wrangler.jsonc` / `wrangler.toml` をソースオブトゥルースとし、Terraform と Wrangler で同じ Worker 設定を二重管理しない。

Terraform で管理するもの:

- development / production の Cloudflare D1 database
- Terraform state 保存用の R2 bucket
- 公開ドメイン確定後の Cloudflare DNS / custom domain
- Post-MVP で導入する Cloudflare Turnstile や追加 R2 bucket などの Cloudflare リソース

Wrangler で管理するもの:

- Worker name
- OpenNext for Cloudflare の `main`。例: `.open-next/worker.js`
- OpenNext の static assets 設定
- `compatibility_date` と `compatibility_flags`
- D1 binding `DB` と environment ごとの `database_id`
- OpenNext が必要とする service binding や assets binding
- secret ではない runtime variables。例: `APP_ENV`, `APP_BASE_URL`, `EMERGENCY_CONTACT_TO`, `EMERGENCY_CONTACT_FROM`

Secrets として登録するもの:

- `ADMIN_PASSWORD_HASH`
- `ADMIN_PASSWORD_SALT`
- `SESSION_SECRET`
- `RESEND_API_KEY`
- `VOTE_TOKEN_SECRET`

secret 値は Terraform state に残る可能性があるため、Terraform では管理しない。環境ごとに `wrangler secret` または Cloudflare Secrets で登録する。

## ディレクトリ構成

```
terraform/
├── modules/
│   ├── d1/        # Cloudflare D1 データベースモジュール
│   └── r2/        # Cloudflare R2 バケットモジュール
└── environments/
    └── dev/       # development 環境（develop ブランチ対応）
        ├── main.tf
        ├── backend.tf              # 初回のみコメントアウト → 解除して使う
        ├── backend.hcl.example     # R2 backend 接続情報のテンプレート
        ├── variables.tf
        ├── outputs.tf
        └── terraform.tfvars.example
```

> `environments/prod/` は MVP 後に追加予定。

## ブランチと環境の対応

| ブランチ | 環境 | ディレクトリ |
|---|---|---|
| `develop` | development | `environments/dev/` |
| `main` | production | `environments/prod/` (未作成) |

---

## 通常の開発フロー

基本的に **手動での `terraform apply` は行わない**。

```
terraform/ 配下を変更
  ↓
PR 作成
  ↓
GitHub Actions が terraform plan を自動実行 → PR にコメントで結果を表示
  ↓
レビュー・承認
  ↓
develop へマージ
  ↓
GitHub Actions が terraform apply を自動実行
```

---

## 初回セットアップ（一度だけ手動実行が必要）

R2 state バケットが存在しないため、最初の 1 回だけ手動で実行する。

Terraform state 用 R2 bucket は bootstrap 対象である。初回だけ local state で R2 bucket と development 用 D1 を作成し、その後 `backend.tf` を有効化して state を R2 backend に移行する。以降は remote state を前提に PR → plan → merge → apply のフローで運用する。

### 1. 前提条件

- Terraform >= 1.6 がインストールされていること
- Cloudflare API token（D1・R2 の作成権限あり）を取得済みであること
- R2 用 S3 互換 API token を取得済みであること
  - Cloudflare ダッシュボード → R2 → **Manage R2 API Tokens** で発行する
  - 通常の API token とは別物

### 2. tfvars と backend.hcl を作成

```bash
cd terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
# 両ファイルに実際の値を記入する
```

### 3. ローカル state で初回 apply（R2 バケットと D1 を作成）

`backend.tf` の `terraform { backend "s3" {} }` がコメントアウトされていることを確認して実行する。

```bash
terraform init
terraform apply
```

### 4. backend.tf のコメントアウトを解除して state を R2 に移行

```bash
# backend.tf の terraform { backend "s3" {} } を解除する
terraform init -backend-config=backend.hcl
# "Do you want to copy existing state to the new backend?" → yes
```

以降は PR → plan → merge → apply の自動フローで運用する。

---

## GitHub Secrets の設定

リポジトリの **Settings → Secrets and variables → Actions** に以下を登録する。

| Secret 名 | 説明 |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID |
| `CLOUDFLARE_API_TOKEN` | Terraform 用 Cloudflare API token（D1・R2 作成権限） |
| `R2_ACCESS_KEY_ID` | R2 S3 互換 API token の Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 S3 互換 API token の Secret Access Key |
