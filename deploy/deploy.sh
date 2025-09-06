#!/bin/bash
set -e

echo "🚀 Starting ShushPlace deployment..."

# Check prerequisites
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Run 'aws configure' first."
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not installed."
    exit 1
fi

cd "$(dirname "$0")"

echo "📦 Creating Lambda deployment packages..."
find lambda -name "*.js" -o -name "*.py" | while read file; do
    dir=$(dirname "$file")
    cd "$dir"
    zip -r deployment.zip . > /dev/null 2>&1
    cd - > /dev/null
done

echo "🏗️ Initializing Terraform..."
terraform init

echo "📋 Planning deployment..."
terraform plan -out=tfplan

echo "🚀 Deploying infrastructure..."
terraform apply tfplan

echo "🧹 Cleaning up..."
rm -f tfplan

echo ""
echo "✅ Deployment completed!"
echo "📊 Outputs:"
terraform output

echo ""
echo "🌐 Your ShushPlace application is ready!"
echo "CloudFront URL: https://$(terraform output -raw cloudfront_domain_name)"
echo "API Gateway URL: $(terraform output -raw api_gateway_url)"
