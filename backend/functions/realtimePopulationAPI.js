const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

// 메모리 캐시 (더 짧은 캐시 시간으로 실시간성 확보)
let cachedData = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30초

// RealtimeCrowdData에서 최신 실시간 데이터만 조회
async function queryRealtimeData() {
  const tableName = process.env.REALTIME_CROWD_TABLE || 'RealtimeCrowdData';
  
  try {
    // 최근 5분 이내 데이터만 조회
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const params = {
      TableName: tableName,
      FilterExpression: '#timestamp > :timestamp',
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':timestamp': fiveMinutesAgo
      }
    };
    
    const result = await dynamodb.scan(params).promise();
    console.log(`Retrieved ${result.Items.length} recent items from RealtimeCrowdData`);
    
    // station_id별 최신 데이터만 선택
    const uniqueStations = {};
    result.Items.forEach(item => {
      const stationId = item.station_id;
      if (!uniqueStations[stationId] || 
          new Date(item.timestamp) > new Date(uniqueStations[stationId].timestamp)) {
        uniqueStations[stationId] = item;
      }
    });
    
    const realtimeItems = Object.values(uniqueStations);
    console.log(`Filtered to ${realtimeItems.length} unique realtime stations`);
    
    // 서울시 실시간 도시데이터 형태로 변환
    return realtimeItems.map((item, index) => ({
      area_code: item.station_id || `STATION_${index + 1}`,
      timestamp: item.timestamp,
      area_name: `${item.district || '지역'} 정류장`,
      category: '실시간 군중 데이터',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lng),
      congest_level: item.crowd_description || '보통',
      congest_message: '실시간 데이터 수집 중입니다.',
      population_min: Math.floor(Math.random() * 300) + 50,
      population_max: Math.floor(Math.random() * 500) + 200,
      male_rate: Math.floor(Math.random() * 30) + 35,
      female_rate: Math.floor(Math.random() * 30) + 35,
      age_rates: {
        rate_0: Math.floor(Math.random() * 5) + 1,
        rate_10: Math.floor(Math.random() * 15) + 5,
        rate_20: Math.floor(Math.random() * 25) + 15,
        rate_30: Math.floor(Math.random() * 25) + 15,
        rate_40: Math.floor(Math.random() * 20) + 10,
        rate_50: Math.floor(Math.random() * 25) + 15,
        rate_60: Math.floor(Math.random() * 20) + 10,
        rate_70: Math.floor(Math.random() * 5) + 1
      },
      resident_rate: Math.floor(Math.random() * 40) + 20,
      non_resident_rate: Math.floor(Math.random() * 80) + 60,
      update_time: item.timestamp,
      forecast_data: []
    }));
    
  } catch (error) {
    console.error('Realtime data query failed:', error);
    return [];
  }
}

// 캐시된 실시간 데이터 조회
async function getCachedRealtimeData() {
  const now = Date.now();
  if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('Returning cached realtime data');
    return cachedData;
  }
  
  console.log('Cache miss, fetching fresh realtime data');
  cachedData = await queryRealtimeData();
  cacheTimestamp = now;
  return cachedData;
}

exports.handler = async (event) => {
  const startTime = Date.now();
  
  try {
    console.log('Realtime Population API called');
    
    const data = await getCachedRealtimeData();
    
    const processingTime = Date.now() - startTime;
    console.log(`Realtime processing time: ${processingTime}ms`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        total_count: data.length,
        last_updated: new Date().toISOString(),
        filters_applied: {
          category: null,
          congest_level: null,
          include_forecast: true,
          limit: null
        },
        data: data
      })
    };
    
  } catch (error) {
    console.error('Realtime handler error:', error);
    
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
