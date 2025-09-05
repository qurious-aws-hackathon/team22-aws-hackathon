#!/bin/bash

# Deploy realtime population Lambda function
FUNCTION_NAME="realtimePopulationAPI"
REGION="us-east-1"

echo "Deploying $FUNCTION_NAME to $REGION..."

# Create deployment package
zip -r ${FUNCTION_NAME}.zip realtimePopulationAPI.js package.json node_modules/

# Update Lambda function
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://${FUNCTION_NAME}.zip \
  --region $REGION

# Update environment variables
aws lambda update-function-configuration \
  --function-name $FUNCTION_NAME \
  --environment Variables='{
    "REALTIME_CROWD_TABLE":"RealtimeCrowdData",
    "PLACES_CURRENT_TABLE":"PlacesCurrent"
  }' \
  --region $REGION

echo "Deployment complete!"

# Clean up
rm ${FUNCTION_NAME}.zip
