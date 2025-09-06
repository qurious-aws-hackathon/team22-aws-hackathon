#!/bin/bash
set -e

echo "🧹 Starting cleanup..."

cd "$(dirname "$0")"

if [ ! -f "terraform.tfstate" ]; then
    echo "⚠️ No Terraform state found."
    exit 0
fi

echo "⚠️ This will destroy ALL resources!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo "🗑️ Emptying S3 buckets..."
website_bucket=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
images_bucket=$(terraform output -raw s3_images_bucket_name 2>/dev/null || echo "")

[ ! -z "$website_bucket" ] && aws s3 rm s3://$website_bucket --recursive 2>/dev/null || true
[ ! -z "$images_bucket" ] && aws s3 rm s3://$images_bucket --recursive 2>/dev/null || true

echo "💥 Destroying infrastructure..."
terraform destroy -auto-approve

echo "🧹 Cleaning up files..."
find lambda -name "deployment.zip" -delete 2>/dev/null || true

echo "✅ Cleanup completed!"
