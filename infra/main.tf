# Example Terraform configuration for deploying to AWS
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "static_assets" {
  bucket = "forgevid-ai-static-assets"
  acl    = "private"
}

# Add more resources as needed (EC2, RDS, etc.)
