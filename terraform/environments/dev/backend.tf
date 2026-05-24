# 【初回】terraform apply で R2 バケットが作成されたら、このブロックのコメントアウトを解除して
# terraform init -backend-config=backend.hcl を実行する。
# ローカル state が R2 に移行される。
#
terraform {
  backend "s3" {}
}
