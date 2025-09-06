# Additional Lambda Functions for Population and API services

resource "aws_iam_role" "api_lambda_role" {
  name = "lambda-api-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "api_lambda_policy" {
  name = "ApiLambdaPolicy"
  role = aws_iam_role.api_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.places_current.arn,
          aws_dynamodb_table.places_history.arn,
          aws_dynamodb_table.realtime_crowd_data.arn,
          aws_dynamodb_table.realtime_population_data.arn
        ]
      }
    ]
  })
}

# Population and API Lambda functions
resource "aws_lambda_function" "collect_population_data" {
  filename         = "lambda/collectPopulationData/deployment.zip"
  function_name    = "collectPopulationData"
  role            = aws_iam_role.api_lambda_role.arn
  handler         = "collectPopulationData.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      SEOUL_API_KEY         = "475268626864726934334652674c4a"
      PLACES_CURRENT_TABLE  = aws_dynamodb_table.places_current.name
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "realtime_population_api" {
  filename         = "lambda/realtimePopulationAPI/deployment.zip"
  function_name    = "realtimePopulationAPI"
  role            = aws_iam_role.api_lambda_role.arn
  handler         = "realtimePopulationAPI.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      REALTIME_POPULATION_TABLE = aws_dynamodb_table.realtime_population_data.name
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "population_api" {
  filename         = "lambda/populationAPI/deployment.zip"
  function_name    = "populationAPI"
  role            = aws_iam_role.api_lambda_role.arn
  handler         = "populationAPI.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      SEOUL_API_KEY           = "475268626864726934334652674c4a"
      REALTIME_CROWD_TABLE    = aws_dynamodb_table.realtime_crowd_data.name
      PLACES_CURRENT_TABLE    = aws_dynamodb_table.places_current.name
      PLACES_HISTORY_TABLE    = aws_dynamodb_table.places_history.name
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "realtime_crowd_collector" {
  filename         = "lambda/realtimeCrowdCollector/deployment.zip"
  function_name    = "realtimeCrowdCollector"
  role            = aws_iam_role.api_lambda_role.arn
  handler         = "realtimeCrowdCollector.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      CITS_API_KEY          = "8e84b7de-8405-4c7d-9465-3adf3d574e5c"
      BUS_API_KEY           = "sample_bus_key"
      REALTIME_CROWD_TABLE  = aws_dynamodb_table.realtime_crowd_data.name
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "realtime_population_collector" {
  filename         = "lambda/realtimePopulationCollector/deployment.zip"
  function_name    = "realtimePopulationCollector"
  role            = aws_iam_role.api_lambda_role.arn
  handler         = "realtimePopulationCollector.handler"
  runtime         = "nodejs16.x"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      SEOUL_API_KEY             = "475268626864726934334652674c4a"
      REALTIME_POPULATION_TABLE = aws_dynamodb_table.realtime_population_data.name
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "population_collector" {
  filename         = "lambda/populationCollector/deployment.zip"
  function_name    = "populationCollector"
  role            = aws_iam_role.api_lambda_role.arn
  handler         = "populationCollector.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      SEOUL_API_KEY         = "sample_key"
      PLACES_CURRENT_TABLE  = aws_dynamodb_table.places_current.name
      PLACES_HISTORY_TABLE  = aws_dynamodb_table.places_history.name
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "kakao_proxy" {
  filename         = "lambda/kakaoProxy/deployment.zip"
  function_name    = "kakaoProxy"
  role            = aws_iam_role.api_lambda_role.arn
  handler         = "kakaoProxy.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      KAKAO_REST_API_KEY = "8c1fdb56c5453d5dbdb8631e81eefabf"
    }
  }
  tags = local.common_tags
}

# Additional image functions
resource "aws_iam_role" "image_upload_lambda_role" {
  name = "ImageUploadLambdaRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "image_upload_lambda_policy" {
  name = "ImageUploadLambdaPolicy"
  role = aws_iam_role.image_upload_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.image_metadata.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.image_upload.arn}/*"
      }
    ]
  })
}

resource "aws_lambda_function" "image_upload_function" {
  filename         = "lambda/ImageUploadFunction/deployment.zip"
  function_name    = "ImageUploadFunction"
  role            = aws_iam_role.image_upload_lambda_role.arn
  handler         = "lambda_function_fixed.lambda_handler"
  runtime         = "python3.9"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      TABLE_NAME  = aws_dynamodb_table.image_metadata.name
      BUCKET_NAME = aws_s3_bucket.image_upload.id
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "image_viewer_function" {
  filename         = "lambda/ImageViewerFunction/deployment.zip"
  function_name    = "ImageViewerFunction"
  role            = aws_iam_role.image_upload_lambda_role.arn
  handler         = "image_viewer.lambda_handler"
  runtime         = "python3.9"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      TABLE_NAME  = aws_dynamodb_table.image_metadata.name
      BUCKET_NAME = aws_s3_bucket.image_upload.id
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "direct_image_upload" {
  filename         = "lambda/directImageUpload/deployment.zip"
  function_name    = "directImageUpload"
  role            = aws_iam_role.chatbot_lambda_role.arn
  handler         = "direct-image-upload.lambda_handler"
  runtime         = "python3.11"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

# Session cleanup function
resource "aws_lambda_function" "shitplace_session_cleanup" {
  filename         = "lambda/shitplace-session-cleanup/deployment.zip"
  function_name    = "shitplace-session-cleanup"
  role            = aws_iam_role.chatbot_lambda_role.arn
  handler         = "session-cleanup.lambda_handler"
  runtime         = "python3.11"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}
