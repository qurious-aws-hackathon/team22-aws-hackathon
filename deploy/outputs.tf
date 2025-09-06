output "api_gateway_url" {
  description = "API Gateway URL"
  value       = aws_api_gateway_deployment.shushplace_deployment.invoke_url
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.website.id
}

output "s3_bucket_name" {
  description = "S3 bucket name for website"
  value       = aws_s3_bucket.website.id
}

output "s3_images_bucket_name" {
  description = "S3 bucket name for images"
  value       = aws_s3_bucket.images.id
}
