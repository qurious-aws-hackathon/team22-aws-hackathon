# CORS Configuration for API Gateway and Lambda

## Lambda Function CORS Headers

Add this to your Lambda function responses:

```python
# Python Lambda
def lambda_handler(event, context):
    # Your business logic here
    
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',  # or 'http://localhost:5173' for dev
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(your_response_data)
    }
```

```javascript
// Node.js Lambda
exports.handler = async (event) => {
    // Your business logic here
    
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(responseData)
    };
};
```

## API Gateway CORS Configuration

### Method 1: AWS CLI Commands

```bash
# Enable CORS for a specific resource
aws apigateway put-method \
    --rest-api-id YOUR_API_ID \
    --resource-id YOUR_RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region ap-northeast-2

# Add CORS response headers
aws apigateway put-method-response \
    --rest-api-id YOUR_API_ID \
    --resource-id YOUR_RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false \
    --region ap-northeast-2

# Deploy changes
aws apigateway create-deployment \
    --rest-api-id YOUR_API_ID \
    --stage-name dev \
    --region ap-northeast-2
```

### Method 2: CloudFormation Template

```yaml
Resources:
  ApiGatewayRestApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: ShitPlaceAPI
      
  ApiGatewayResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref ApiGatewayRestApi
      ParentId: !GetAtt ApiGatewayRestApi.RootResourceId
      PathPart: places
      
  ApiGatewayMethodOptions:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref ApiGatewayRestApi
      ResourceId: !Ref ApiGatewayResource
      HttpMethod: OPTIONS
      AuthorizationType: NONE
      Integration:
        Type: MOCK
        IntegrationResponses:
          - StatusCode: 200
            ResponseParameters:
              method.response.header.Access-Control-Allow-Headers: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
              method.response.header.Access-Control-Allow-Methods: "'GET,POST,PUT,DELETE,OPTIONS'"
              method.response.header.Access-Control-Allow-Origin: "'*'"
        RequestTemplates:
          application/json: '{"statusCode": 200}'
      MethodResponses:
        - StatusCode: 200
          ResponseParameters:
            method.response.header.Access-Control-Allow-Headers: false
            method.response.header.Access-Control-Allow-Methods: false
            method.response.header.Access-Control-Allow-Origin: false
```

## Frontend Axios Configuration

```typescript
// src/utils/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.VITE_API_KEY,
  },
});

// Request interceptor
api.interceptors.request.use((config) => {
  console.log('API Request:', config.method?.toUpperCase(), config.url);
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      console.error('CORS or API Key error');
    }
    return Promise.reject(error);
  }
);

export default api;
```

## Quick Fix Commands

Run these if you have API Gateway access:

```bash
# Find your API ID
aws apigateway get-rest-apis --region ap-northeast-2

# Enable CORS for all methods (replace YOUR_API_ID)
aws apigateway put-gateway-response \
    --rest-api-id YOUR_API_ID \
    --response-type DEFAULT_4XX \
    --response-parameters gatewayresponse.header.Access-Control-Allow-Origin="'*'",gatewayresponse.header.Access-Control-Allow-Headers="'*'" \
    --region ap-northeast-2

aws apigateway put-gateway-response \
    --rest-api-id YOUR_API_ID \
    --response-type DEFAULT_5XX \
    --response-parameters gatewayresponse.header.Access-Control-Allow-Origin="'*'",gatewayresponse.header.Access-Control-Allow-Headers="'*'" \
    --region ap-northeast-2
```
