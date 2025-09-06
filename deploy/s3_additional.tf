# Additional S3 buckets

resource "aws_s3_bucket" "image_upload" {
  bucket = "image-upload-${local.account_id}"
  tags = local.common_tags
}

resource "aws_s3_bucket_cors_configuration" "image_upload" {
  bucket = aws_s3_bucket.image_upload.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "POST", "PUT", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket" "file_storage" {
  bucket = "file-storage-bucket-${formatdate("YYYYMMDD", timestamp())}"
  tags = local.common_tags
}

resource "aws_s3_bucket_cors_configuration" "file_storage" {
  bucket = aws_s3_bucket.file_storage.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "POST", "PUT", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
