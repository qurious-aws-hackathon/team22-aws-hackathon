#!/bin/bash

# Setup API Gateway for realtime-population endpoint
API_ID="48hywqoyra"  # Existing API Gateway ID
REGION="us-east-1"
LAMBDA_FUNCTION_ARN="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:realtimePopulationAPI"

echo "Setting up /realtime-population endpoint..."

# Get the root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/`].id' --output text)

# Create the realtime-population resource
RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part "realtime-population" \
  --region $REGION \
  --query 'id' --output text)

# Create GET method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE \
  --region $REGION

# Set up Lambda integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_FUNCTION_ARN/invocations" \
  --region $REGION

# Add Lambda permission for API Gateway
aws lambda add-permission \
  --function-name realtimePopulationAPI \
  --statement-id apigateway-realtime-population \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:*:$API_ID/*/GET/realtime-population" \
  --region $REGION

# Deploy the API
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region $REGION

echo "API Gateway setup complete!"
echo "Endpoint: https://$API_ID.execute-api.$REGION.amazonaws.com/prod/realtime-population"
