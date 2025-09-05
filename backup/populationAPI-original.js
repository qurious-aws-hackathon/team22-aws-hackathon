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
    // 기존 데이터
    { name: "강남구 역삼동", lat: 37.5009, lng: 127.0364, basePopulation: 8500, type: "business" },
    { name: "강남구 논현동", lat: 37.5048, lng: 127.0280, basePopulation: 4200, type: "residential" },
    { name: "강남구 압구정동", lat: 37.5274, lng: 127.0280, basePopulation: 3800, type: "shopping" },
    { name: "강남구 청담동", lat: 37.5197, lng: 127.0474, basePopulation: 2900, type: "luxury" },
    { name: "강남구 삼성동", lat: 37.5090, lng: 127.0634, basePopulation: 6700, type: "business" },
    
    // 누락된 지역 추가
    { name: "강북구 수유동", lat: 37.6369, lng: 127.0258, basePopulation: 5200, type: "residential" },
    { name: "강북구 미아동", lat: 37.6278, lng: 127.0258, basePopulation: 4800, type: "residential" },
    { name: "노원구 상계동", lat: 37.6541, lng: 127.0658, basePopulation: 6100, type: "residential" },
    { name: "노원구 중계동", lat: 37.6541, lng: 127.0758, basePopulation: 5900, type: "residential" },
    { name: "도봉구 창동", lat: 37.6541, lng: 127.0458, basePopulation: 4500, type: "residential" },
    { name: "도봉구 쌍문동", lat: 37.6641, lng: 127.0358, basePopulation: 3800, type: "residential" },
    { name: "은평구 불광동", lat: 37.6178, lng: 126.9258, basePopulation: 5500, type: "residential" },
    { name: "은평구 연신내", lat: 37.6178, lng: 126.9158, basePopulation: 7200, type: "business" },
    { name: "서대문구 홍제동", lat: 37.5878, lng: 126.9458, basePopulation: 4100, type: "residential" },
    { name: "서대문구 신촌동", lat: 37.5578, lng: 126.9358, basePopulation: 8900, type: "business" },
    { name: "마포구 합정동", lat: 37.5478, lng: 126.9158, basePopulation: 6800, type: "business" },
    { name: "마포구 홍대", lat: 37.5578, lng: 126.9258, basePopulation: 12500, type: "entertainment" },
    { name: "마포구 상암동", lat: 37.5778, lng: 126.8958, basePopulation: 3200, type: "business" },
    { name: "영등포구 여의도", lat: 37.5278, lng: 126.9258, basePopulation: 9800, type: "business" },
    { name: "영등포구 영등포동", lat: 37.5178, lng: 126.9058, basePopulation: 7100, type: "business" },
    { name: "구로구 구로동", lat: 37.4978, lng: 126.8858, basePopulation: 5800, type: "industrial" },
    { name: "구로구 신도림", lat: 37.5078, lng: 126.8958, basePopulation: 8200, type: "business" },
    { name: "금천구 가산동", lat: 37.4778, lng: 126.8858, basePopulation: 6500, type: "industrial" },
    { name: "금천구 독산동", lat: 37.4678, lng: 126.8958, basePopulation: 4900, type: "residential" },
    { name: "관악구 신림동", lat: 37.4778, lng: 126.9258, basePopulation: 8700, type: "residential" },
    { name: "관악구 봉천동", lat: 37.4878, lng: 126.9458, basePopulation: 6200, type: "residential" },
    { name: "동작구 상도동", lat: 37.5078, lng: 126.9458, basePopulation: 5100, type: "residential" },
    { name: "동작구 사당동", lat: 37.4978, lng: 126.9658, basePopulation: 7800, type: "business" },
    { name: "서초구 서초동", lat: 37.4878, lng: 127.0158, basePopulation: 6900, type: "business" },
    { name: "서초구 반포동", lat: 37.5078, lng: 127.0058, basePopulation: 5400, type: "residential" },
    { name: "서초구 잠원동", lat: 37.5178, lng: 127.0158, basePopulation: 4600, type: "residential" },
    { name: "송파구 잠실동", lat: 37.5078, lng: 127.0858, basePopulation: 9200, type: "business" },
    { name: "송파구 문정동", lat: 37.4878, lng: 127.1258, basePopulation: 6700, type: "residential" },
    { name: "송파구 방이동", lat: 37.5178, lng: 127.1158, basePopulation: 5300, type: "residential" },
    { name: "강동구 천호동", lat: 37.5378, lng: 127.1258, basePopulation: 6100, type: "residential" },
    { name: "강동구 길동", lat: 37.5478, lng: 127.1458, basePopulation: 4800, type: "residential" },
    { name: "강동구 둔촌동", lat: 37.5278, lng: 127.1358, basePopulation: 5600, type: "residential" }
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
      dataSource: "Mock 데이터 (전체 서울 커버리지)"
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
    luxury: "고급 주거지",
    industrial: "산업 지역",
    entertainment: "유흥가"
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
      console.log('DynamoDB query failed:', error.message);
      throw error;
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
