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

module "d1" {
  source     = "../../modules/d1"
  account_id = var.cloudflare_account_id
  name       = "carrymybottle-dev"
}
