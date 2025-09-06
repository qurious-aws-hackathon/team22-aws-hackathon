resource "aws_api_gateway_rest_api" "shushplace_api" {
  name        = "shushplace-api"
  description = "ShushPlace API Gateway"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = local.common_tags
}

resource "aws_api_gateway_method" "cors_method" {
  rest_api_id   = aws_api_gateway_rest_api.shushplace_api.id
  resource_id   = aws_api_gateway_rest_api.shushplace_api.root_resource_id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "cors_integration" {
  rest_api_id = aws_api_gateway_rest_api.shushplace_api.id
  resource_id = aws_api_gateway_rest_api.shushplace_api.root_resource_id
  http_method = aws_api_gateway_method.cors_method.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "cors_method_response" {
  rest_api_id = aws_api_gateway_rest_api.shushplace_api.id
  resource_id = aws_api_gateway_rest_api.shushplace_api.root_resource_id
  http_method = aws_api_gateway_method.cors_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "cors_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.shushplace_api.id
  resource_id = aws_api_gateway_rest_api.shushplace_api.root_resource_id
  http_method = aws_api_gateway_method.cors_method.http_method
  status_code = aws_api_gateway_method_response.cors_method_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_deployment" "shushplace_deployment" {
  depends_on = [
    aws_api_gateway_method.cors_method,
    aws_api_gateway_integration.cors_integration,
  ]

  rest_api_id = aws_api_gateway_rest_api.shushplace_api.id
  stage_name  = "prod"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lambda_permission" "api_gateway_lambda_permissions" {
  for_each = {
    getSpots                           = aws_lambda_function.get_spots.function_name
    createSpot                         = aws_lambda_function.create_spot.function_name
    updateSpot                         = aws_lambda_function.update_spot.function_name
    deleteSpot                         = aws_lambda_function.delete_spot.function_name
    getSpotDetail                      = aws_lambda_function.get_spot_detail.function_name
    likeSpot                          = aws_lambda_function.like_spot.function_name
    dislikeSpot                       = aws_lambda_function.dislike_spot.function_name
    checkLikeStatus                   = aws_lambda_function.check_like_status.function_name
    getReactionStatus                 = aws_lambda_function.get_reaction_status.function_name
    addComment                        = aws_lambda_function.add_comment.function_name
    recommendSpots                    = aws_lambda_function.recommend_spots.function_name
    "shitplace-login"                 = aws_lambda_function.shitplace_login.function_name
    "shitplace-register"              = aws_lambda_function.shitplace_register.function_name
    "shitplace-chat-handler"          = aws_lambda_function.shitplace_chat_handler.function_name
    "shitplace-recommendation-engine" = aws_lambda_function.shitplace_recommendation_engine.function_name
    "shitplace-imageUpload"           = aws_lambda_function.shitplace_image_upload.function_name
  }

  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.shushplace_api.execution_arn}/*/*"
}
