const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

// PlacesCurrent 데이터 조회 (모든 100개 데이터 반환)
async function queryPlacesCurrentData() {
  const tableName = process.env.PLACES_CURRENT_TABLE || 'PlacesCurrent';
  
  try {
    const params = {
      TableName: tableName
    };
    
    const result = await dynamodb.scan(params).promise();
    console.log(`Retrieved ${result.Items.length} items from PlacesCurrent`);
    
    return result.Items.map((item, index) => ({
      id: `place_${index + 1}`,
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      population: item.population,
      noiseLevel: item.noiseLevel,
      crowdLevel: item.crowdLevel,
      category: item.category,
      type: item.type || 'real_data',
      lastUpdated: item.lastUpdated,
      walkingRecommendation: item.walkingRecommendation,
      dataSource: item.dataSource,
      areaCode: item.areaCode,
      updateTime: item.updateTime
    }));
    
  } catch (error) {
    console.error('PlacesCurrent query failed:', error);
    return [];
  }
}

// RealtimeCrowdData 조회 (중복 제거 및 지역 균형 조정)
async function queryRealtimeCrowdData() {
  const tableName = process.env.REALTIME_CROWD_TABLE || 'RealtimeCrowdData';
  
  try {
    const params = {
      TableName: tableName
    };
    
    const result = await dynamodb.scan(params).promise();
    console.log(`Retrieved ${result.Items.length} raw items from RealtimeCrowdData`);
    
    // station_id별 최신 데이터만 선택
    const uniqueStations = {};
    result.Items.forEach(item => {
      const stationId = item.station_id;
      if (!uniqueStations[stationId] || 
          new Date(item.timestamp) > new Date(uniqueStations[stationId].timestamp)) {
        uniqueStations[stationId] = item;
      }
    });
    
    const deduplicatedItems = Object.values(uniqueStations);
    console.log(`Deduplicated to ${deduplicatedItems.length} unique stations`);
    
    const crowdData = deduplicatedItems.map((item, index) => ({
      id: `crowd_${index + 1}`,
      name: `${item.district || '지역'} 정류장`,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lng),
      population: Math.floor(Math.random() * 500) + 100, // 추정값
      noiseLevel: item.crowd_level || 1,
      crowdLevel: item.crowd_level || 1,
      category: '실시간 군중 데이터',
      type: 'realtime_crowd',
      lastUpdated: item.timestamp,
      walkingRecommendation: item.crowd_description === '보통' ? '적당한 활기' : '혼잡 주의',
      dataSource: 'C-ITS 실시간 데이터 (최신)',
      areaCode: item.station_id,
      updateTime: item.timestamp,
      congestionLevel: item.congestion_level,
      district: item.district
    }));
    
    // RealtimeCrowdData에만 지역 균형 조정 적용
    return balanceRegionalData(crowdData);
    
  } catch (error) {
    console.error('RealtimeCrowdData query failed:', error);
    return [];
  }
}

// 지역별 균형 조정 함수
function balanceRegionalData(data) {
  const REGION_LIMIT = 8; // 지역별 최대 8개 항목
  const coordMap = new Map();
  const regionCounts = {};
  
  const balanced = data.filter(item => {
    // 1. 좌표 기반 중복 제거 (반경 100m 내 동일 간주)
    const coordKey = `${Math.round(item.lat * 1000)}_${Math.round(item.lng * 1000)}`;
    if (coordMap.has(coordKey)) return false;
    coordMap.set(coordKey, true);
    
    // 2. 지역 추출
    let region = '기타구';
    if (item.district) {
      region = item.district;
    } else if (item.name && item.name.includes('구')) {
      region = item.name.includes('마포구') ? '마포구' : 
               item.name.includes('강남구') ? '강남구' : 
               item.name.includes('용산구') ? '용산구' : '기타구';
    }
    
    // 3. 지역별 수량 제한
    regionCounts[region] = (regionCounts[region] || 0) + 1;
    return regionCounts[region] <= REGION_LIMIT;
  });
  
  console.log('Regional distribution after balancing:', regionCounts);
  return balanced;
}

// 통합 데이터 조회 (캐시 없음)
async function getIntegratedData() {
  try {
    console.log('Fetching fresh integrated data - PlacesCurrent all + RealtimeCrowdData balanced');
    
    const [placesData, crowdData] = await Promise.all([
      queryPlacesCurrentData(),
      queryRealtimeCrowdData()
    ]);
    
    const combinedData = [...placesData, ...crowdData];
    console.log(`Combined data: ${placesData.length} places + ${crowdData.length} balanced crowd stations = ${combinedData.length} total`);
    
    return combinedData;
    
  } catch (error) {
    console.error('Integrated data fetch failed:', error);
    throw error;
  }
}

// Mock 데이터 (최후 fallback)
function getMockData() {
  return Array.from({ length: 100 }, (_, i) => ({
    id: `mock_${i + 1}`,
    name: `장소 ${i + 1}`,
    lat: 37.5665 + (Math.random() - 0.5) * 0.1,
    lng: 126.9780 + (Math.random() - 0.5) * 0.1,
    population: Math.floor(Math.random() * 1000) + 100,
    noiseLevel: Math.floor(Math.random() * 5) + 1,
    crowdLevel: Math.floor(Math.random() * 3) + 1,
    category: ['관광지', '상업지역', '주거지역'][Math.floor(Math.random() * 3)],
    type: 'mock',
    lastUpdated: new Date().toISOString(),
    walkingRecommendation: Math.random() > 0.5 ? '추천' : '비추천',
    dataSource: "Mock Data (fallback)",
    areaCode: `AREA_${String(i + 1).padStart(3, '0')}`,
    updateTime: new Date().toISOString()
  }));
}

exports.handler = async (event) => {
  const startTime = Date.now();
  
  try {
    console.log('Population API called - PlacesCurrent all + RealtimeCrowdData balanced');
    
    let data;
    try {
      data = await getIntegratedData();
    } catch (error) {
      console.log('Falling back to mock data due to error:', error.message);
      data = getMockData();
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`Total processing time: ${processingTime}ms`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data: data,
        metadata: {
          total: data.length,
          timestamp: new Date().toISOString(),
          processingTimeMs: processingTime,
          cached: false,
          version: 'no-cache',
          dataSources: {
            places: data.filter(d => d.type !== 'realtime_crowd').length,
            uniqueCrowdStations: data.filter(d => d.type === 'realtime_crowd').length
          }
        }
      })
    };
    
  } catch (error) {
    console.error('Handler error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
