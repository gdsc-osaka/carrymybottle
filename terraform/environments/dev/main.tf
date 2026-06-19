terraform {
  required_version = ">= 1.6"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

module "r2_tfstate" {
  source     = "../../modules/r2"
  account_id = var.cloudflare_account_id
  name       = "carrymybottle-tfstate"
}

# 給水機の写真を保存する R2 バケット（#190）。dev / prod でバケットを分離する。
# 配信は公開バケット + カスタムドメイン（prod）/ r2.dev マネージドURL（dev）を想定し、
# Worker 経由配信は行わない。アップロード（PUT）は Worker の R2 バインディング経由。
module "r2_station_images" {
  source     = "../../modules/r2"
  account_id = var.cloudflare_account_id
  name       = "carrymybottle-station-images-dev"
}

module "d1" {
  source     = "../../modules/d1"
  account_id = var.cloudflare_account_id
  name       = "carrymybottle-dev"
}
