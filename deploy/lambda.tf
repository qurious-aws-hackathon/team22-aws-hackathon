resource "aws_lambda_function" "get_spots" {
  filename         = "lambda/getSpots/deployment.zip"
  function_name    = "getSpots"
  role            = aws_iam_role.spot_lambda_role.arn
  handler         = "getSpots.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

resource "aws_lambda_function" "create_spot" {
  filename         = "lambda/createSpot/deployment.zip"
  function_name    = "createSpot"
  role            = aws_iam_role.spot_lambda_role.arn
  handler         = "createSpot.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

resource "aws_lambda_function" "update_spot" {
  filename         = "lambda/updateSpot/deployment.zip"
  function_name    = "updateSpot"
  role            = aws_iam_role.spot_lambda_role.arn
  handler         = "updateSpot.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

resource "aws_lambda_function" "delete_spot" {
  filename         = "lambda/deleteSpot/deployment.zip"
  function_name    = "deleteSpot"
  role            = aws_iam_role.spot_lambda_role.arn
  handler         = "deleteSpot.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      SPOTS_TABLE = aws_dynamodb_table.spots.name
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "get_spot_detail" {
  filename         = "lambda/getSpotDetail/deployment.zip"
  function_name    = "getSpotDetail"
  role            = aws_iam_role.spot_lambda_role.arn
  handler         = "getSpotDetail.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

resource "aws_lambda_function" "like_spot" {
  filename         = "lambda/likeSpot/deployment.zip"
  function_name    = "likeSpot"
  role            = aws_iam_role.spot_lambda_role.arn
  handler         = "likeSpot-optimized.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

resource "aws_lambda_function" "dislike_spot" {
  filename         = "lambda/dislikeSpot/deployment.zip"
  function_name    = "dislikeSpot"
  role            = aws_iam_role.spot_lambda_role.arn
  handler         = "dislikeSpot-optimized.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

resource "aws_lambda_function" "check_like_status" {
  filename         = "lambda/checkLikeStatus/deployment.zip"
  function_name    = "checkLikeStatus"
  role            = aws_iam_role.spot_lambda_role.arn
  handler         = "checkLikeStatus.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

resource "aws_lambda_function" "get_reaction_status" {
  filename         = "lambda/getReactionStatus/deployment.zip"
  function_name    = "getReactionStatus"
  role            = aws_iam_role.spot_lambda_role.arn
  handler         = "getReactionStatus.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

resource "aws_lambda_function" "add_comment" {
  filename         = "lambda/addComment/deployment.zip"
  function_name    = "addComment"
  role            = aws_iam_role.spot_lambda_role.arn
  handler         = "dynamodb_lambda_v3.commentHandler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

resource "aws_lambda_function" "recommend_spots" {
  filename         = "lambda/recommendSpots/deployment.zip"
  function_name    = "recommendSpots"
  role            = aws_iam_role.spot_lambda_role.arn
  handler         = "recommendSpots_v3.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

resource "aws_lambda_function" "shitplace_login" {
  filename         = "lambda/shitplace-login/deployment.zip"
  function_name    = "shitplace-login"
  role            = aws_iam_role.auth_lambda_role.arn
  handler         = "login_fixed.lambda_handler"
  runtime         = "python3.9"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      JWT_SECRET = "shitplace-jwt-secret-key-2024"
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "shitplace_register" {
  filename         = "lambda/shitplace-register/deployment.zip"
  function_name    = "shitplace-register"
  role            = aws_iam_role.auth_lambda_role.arn
  handler         = "register_fixed.lambda_handler"
  runtime         = "python3.9"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      JWT_SECRET = "shitplace-jwt-secret-key-2024"
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "shitplace_chat_handler" {
  filename         = "lambda/shitplace-chat-handler/deployment.zip"
  function_name    = "shitplace-chat-handler"
  role            = aws_iam_role.chatbot_lambda_role.arn
  handler         = "chat-handler.lambda_handler"
  runtime         = "python3.11"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      SPOTS_TABLE           = aws_dynamodb_table.spots.name
      BEDROCK_MODEL_ID      = "anthropic.claude-3-haiku-20240307-v1:0"
      MESSAGES_TABLE        = aws_dynamodb_table.chat_messages.name
      SESSIONS_TABLE        = aws_dynamodb_table.chat_sessions.name
    }
  }
  tags = local.common_tags
}

resource "aws_lambda_function" "shitplace_recommendation_engine" {
  filename         = "lambda/shitplace-recommendation-engine/deployment.zip"
  function_name    = "shitplace-recommendation-engine"
  role            = aws_iam_role.chatbot_lambda_role.arn
  handler         = "recommendation-engine.lambda_handler"
  runtime         = "python3.11"
  timeout         = 60
  memory_size     = 2048
  tags = local.common_tags
}

resource "aws_lambda_function" "shitplace_image_upload" {
  filename         = "lambda/shitplace-imageUpload/deployment.zip"
  function_name    = "shitplace-imageUpload"
  role            = aws_iam_role.image_lambda_role.arn
  handler         = "imageUpload.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 2048
  environment {
    variables = {
      IMAGE_METADATA_TABLE_NAME = aws_dynamodb_table.shitplace_image_metadata.name
      IMAGES_BUCKET_NAME        = aws_s3_bucket.images.id
    }
  }
  tags = local.common_tags
}
