# =============================================================================
# Bootstrap script: creates the S3 bucket + DynamoDB table for Terraform state
# Run this ONCE before `terraform init` in the infra/ directory.
# =============================================================================
# Usage:
#   aws configure  (set up your AWS credentials first)
#   ./bootstrap-terraform-state.sh
# =============================================================================

set -euo pipefail

BUCKET_NAME="forgevid-terraform-state"
LOCK_TABLE="forgevid-terraform-locks"
REGION="us-east-1"

echo "Creating S3 bucket for Terraform state..."
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$REGION" \
  2>/dev/null || echo "Bucket already exists"

echo "Enabling versioning on S3 bucket..."
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled

echo "Enabling encryption on S3 bucket..."
aws s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }]
  }'

echo "Blocking public access on S3 bucket..."
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "Creating DynamoDB table for state locking..."
aws dynamodb create-table \
  --table-name "$LOCK_TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" \
  2>/dev/null || echo "Table already exists"

echo ""
echo "Done! You can now run:"
echo "  cd infra/"
echo "  terraform init"
echo "  terraform plan -var-file=production.tfvars"
