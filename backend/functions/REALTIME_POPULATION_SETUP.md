# Realtime Population API Setup

## 🎯 Overview
새로운 `/realtime-population` 엔드포인트를 추가하여 실시간 인구밀도 데이터를 제공합니다.

## 📁 Files Created
- `realtimePopulationAPI.js` - Lambda function for realtime data
- `deploy-realtime-population.sh` - Deployment script
- `setup-api-gateway.sh` - API Gateway configuration

## 🔧 Lambda Function Features
- **30초 캐시**: 실시간성을 위한 짧은 캐시 시간
- **최근 5분 데이터**: 최신 데이터만 조회
- **중복 제거**: station_id별 최신 데이터만 반환
- **실시간 추정**: 인구수와 소음레벨 실시간 계산

## 🌐 API Endpoint
```
GET https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/realtime-population
```

## 📊 Response Format
```json
{
  "success": true,
  "places": [
    {
      "place_id": "realtime_STATION_001",
      "current": "latest",
      "name": "강남구 실시간",
      "lat": 37.5665,
      "lng": 126.9780,
      "population": 150,
      "crowdLevel": 2,
      "noiseLevel": 65,
      "lastUpdated": "2024-09-05T14:57:00Z",
      "dataSource": "C-ITS 실시간"
    }
  ],
  "metadata": {
    "total": 25,
    "timestamp": "2024-09-05T14:57:30Z",
    "version": "realtime"
  }
}
```

## 🚀 Deployment Steps

1. **Deploy Lambda Function**:
   ```bash
   cd /Users/igeon/Projects/team22-aws-hackathon/backend/functions
   ./deploy-realtime-population.sh
   ```

2. **Setup API Gateway** (update YOUR_ACCOUNT_ID first):
   ```bash
   # Edit setup-api-gateway.sh and replace YOUR_ACCOUNT_ID
   ./setup-api-gateway.sh
   ```

3. **Test Endpoint**:
   ```bash
   curl https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/realtime-population
   ```

## 🔄 Frontend Integration
The frontend has been updated to:
- Use `api.population.getRealtimePopulation()` instead of `getPopulation()`
- Refresh data every 30 seconds for real-time updates
- Display "실시간 혼잡도" in UI elements
- Handle the new response format with `places` field

## 📋 Environment Variables
```
REALTIME_CROWD_TABLE=RealtimeCrowdData
PLACES_CURRENT_TABLE=PlacesCurrent
```

## 🔍 Monitoring
- CloudWatch logs: `/aws/lambda/realtimePopulationAPI`
- Cache hit rate logged in function output
- Processing time metrics included in response
