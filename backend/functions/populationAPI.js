const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

// DynamoDB에서 데이터 조회
async function queryFromDynamoDB() {
  const tableName = process.env.PLACES_CURRENT_TABLE || 'PlacesCurrent';
  
  try {
    console.log('Querying data from DynamoDB:', tableName);
    
    const params = {
      TableName: tableName,
      FilterExpression: '#current = :current',
      ExpressionAttributeNames: {
        '#current': 'current'
      },
      ExpressionAttributeValues: {
        ':current': 'latest'
      }
    };
    
    const result = await dynamodb.scan(params).promise();
    console.log(`Retrieved ${result.Items.length} records from DynamoDB`);
    
    // DynamoDB 데이터를 API 응답 형식으로 변환
    return result.Items.map((item, index) => ({
      id: `cached_${index + 1}`,
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      population: item.population,
      noiseLevel: item.noiseLevel,
      crowdLevel: item.crowdLevel,
      category: item.category,
      type: item.type,
      lastUpdated: item.lastUpdated,
      walkingRecommendation: item.walkingRecommendation,
      dataSource: item.dataSource + " (캐시됨)",
      areaCode: item.areaCode,
      updateTime: item.updateTime
    }));
    
  } catch (error) {
    console.error('DynamoDB query failed:', error);
    throw error;
  }
}

// Mock 데이터 (DynamoDB 실패시 사용)
function generateMockData() {
  const seoulAreas = [
    { name: "강남구 역삼동", lat: 37.5009, lng: 127.0364, basePopulation: 8500, type: "business" },
    { name: "강남구 논현동", lat: 37.5048, lng: 127.0280, basePopulation: 4200, type: "residential" },
    { name: "강남구 압구정동", lat: 37.5274, lng: 127.0280, basePopulation: 3800, type: "shopping" },
    { name: "강남구 청담동", lat: 37.5197, lng: 127.0474, basePopulation: 2900, type: "luxury" },
    { name: "강남구 삼성동", lat: 37.5090, lng: 127.0634, basePopulation: 6700, type: "business" }
  ];

  return seoulAreas.map((area, index) => {
    const population = calculateCurrentPopulation(area);
    return {
      id: `mock_${index + 1}`,
      name: area.name,
      lat: area.lat,
      lng: area.lng,
      population: population,
      noiseLevel: calculateNoiseLevel(population),
      crowdLevel: calculateCrowdLevel(population),
      category: getAreaDescription(area.type),
      type: area.type,
      lastUpdated: new Date().toISOString(),
      walkingRecommendation: getWalkingRecommendation(population),
      dataSource: "Mock 데이터"
    };
  });
}

function calculateCurrentPopulation(area) {
  const hour = new Date().getHours();
  let multiplier = 1;
  
  if (hour >= 9 && hour <= 18) {
    multiplier = area.type === 'business' ? 1.8 : 1.1;
  } else if (hour >= 19 && hour <= 23) {
    multiplier = area.type === 'residential' ? 1.8 : 0.7;
  } else {
    multiplier = area.type === 'residential' ? 1.2 : 0.3;
  }
  
  return Math.floor(area.basePopulation * multiplier * (0.8 + Math.random() * 0.4));
}

function calculateCrowdLevel(population) {
  if (population < 3000) return 0;
  if (population < 8000) return 1;
  return 2;
}

function calculateNoiseLevel(population) {
  if (population < 5000) return 0;
  if (population < 10000) return 1;
  return 2;
}

function getAreaDescription(type) {
  const descriptions = {
    business: "비즈니스 지구",
    residential: "주거 지역",
    shopping: "쇼핑 지역",
    luxury: "고급 주거지"
  };
  return descriptions[type] || "일반 지역";
}

function getWalkingRecommendation(population) {
  if (population < 3000) return "여유로운 산책하기 좋음";
  if (population < 8000) return "적당한 활기의 거리 산책";
  return "사람 많은 번화가";
}

// 거리 계산
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

exports.handler = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event));
    
    const queryParams = event.queryStringParameters || {};
    
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: headers, body: '' };
    }
    
    let places = [];
    
    try {
      // DynamoDB에서 캐시된 데이터 조회
      places = await queryFromDynamoDB();
      console.log(`Using cached data from DynamoDB: ${places.length} places`);
    } catch (error) {
      console.log('DynamoDB query failed, using mock data:', error.message);
      places = generateMockData();
    }
    
    // 지리적 필터링
    if (queryParams.lat && queryParams.lng) {
      const centerLat = parseFloat(queryParams.lat);
      const centerLng = parseFloat(queryParams.lng);
      const radius = parseInt(queryParams.radius) || 1000;
      
      places = places.filter(place => {
        const distance = calculateDistance(centerLat, centerLng, place.lat, place.lng);
        place.distance = Math.round(distance);
        return distance <= radius;
      });
      
      places.sort((a, b) => a.distance - b.distance);
    }
    
    // 조용한 곳 우선 정렬
    places.sort((a, b) => {
      const scoreA = a.crowdLevel * 0.6 + a.noiseLevel * 0.4;
      const scoreB = b.crowdLevel * 0.6 + b.noiseLevel * 0.4;
      return scoreA - scoreB;
    });
    
    const limit = parseInt(queryParams.limit) || 20;
    places = places.slice(0, limit);
    
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(places)
    };
    
  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message,
        message: "API 호출 중 오류가 발생했습니다"
      })
    };
  }
};
