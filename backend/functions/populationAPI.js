const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

// 메모리 캐시
let cachedData = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// PlacesCurrent 데이터 조회
async function queryPlacesCurrentData() {
  const tableName = process.env.PLACES_CURRENT_TABLE || 'PlacesCurrent';
  
  try {
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
      type: item.type,
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

// RealtimeCrowdData 조회 (중복 제거)
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
    
    return deduplicatedItems.map((item, index) => ({
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
    
  } catch (error) {
    console.error('RealtimeCrowdData query failed:', error);
    return [];
  }
}

// 통합 데이터 조회
async function getIntegratedData() {
  try {
    console.log('Fetching integrated data with deduplication');
    
    const [placesData, crowdData] = await Promise.all([
      queryPlacesCurrentData(),
      queryRealtimeCrowdData()
    ]);
    
    const combinedData = [...placesData, ...crowdData];
    console.log(`Combined data: ${placesData.length} places + ${crowdData.length} unique crowd stations = ${combinedData.length} total`);
    
    return combinedData;
    
  } catch (error) {
    console.error('Integrated data fetch failed:', error);
    throw error;
  }
}

// 캐시된 데이터 조회
async function getCachedData() {
  const now = Date.now();
  if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('Returning cached deduplicated data');
    return cachedData;
  }
  
  console.log('Cache miss, fetching fresh deduplicated data');
  cachedData = await getIntegratedData();
  cacheTimestamp = now;
  return cachedData;
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
    console.log('Population API called with deduplicated C-ITS data');
    
    let data;
    try {
      data = await getCachedData();
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
          cached: cachedData !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION,
          version: 'deduplicated',
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
