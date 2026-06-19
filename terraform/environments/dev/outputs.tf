output "tfstate_bucket_name" {
  description = "R2 bucket name for Terraform state — set this as bucket in backend.hcl"
  value       = module.r2_tfstate.name
}

output "station_images_bucket_name" {
  description = "R2 bucket name for station images — set this as bucket_name in wrangler.toml [[r2_buckets]] (STATION_IMAGES) for the development environment"
  value       = module.r2_station_images.name
}

output "d1_database_id" {
  description = "D1 database ID — set this as database_id in wrangler.toml [[d1_databases]] for the development environment"
  value       = module.d1.id
}

output "d1_database_name" {
  description = "D1 database name"
  value       = module.d1.name
}
