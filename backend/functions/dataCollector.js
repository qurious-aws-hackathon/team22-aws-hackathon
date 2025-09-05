const AWS = require('aws-sdk');
const axios = require('axios');

const dynamodb = new AWS.DynamoDB.DocumentClient();

// 서울 실시간 데이터 수집
exports.handler = async (event) => {
  try {
    // 1. 실시간 생활인구 데이터
    const populationData = await fetchPopulationData();
    
    // 2. 교통량 데이터
    const trafficData = await fetchTrafficData();
    
    // 3. 공원/문화시설 현황
    const facilityData = await fetchFacilityData();
    
    // 데이터 처리 및 저장
    await processAndSaveData(populationData, trafficData, facilityData);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data collection completed' })
    };
  } catch (error) {
    console.error('Data collection failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function fetchPopulationData() {
  const apiKey = process.env.SEOUL_API_KEY;
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/SPOP_LOCAL_RESD_DONG/1/100/`;
  
  const response = await axios.get(url);
  return response.data.SPOP_LOCAL_RESD_DONG?.row || [];
}

async function fetchTrafficData() {
  const apiKey = process.env.SEOUL_API_KEY;
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/TrafficInfo/1/100/`;
  
  const response = await axios.get(url);
  return response.data.TrafficInfo?.row || [];
}

async function fetchFacilityData() {
  const apiKey = process.env.SEOUL_API_KEY;
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/ListPublicReservationCulture/1/100/`;
  
  const response = await axios.get(url);
  return response.data.ListPublicReservationCulture?.row || [];
}

async function processAndSaveData(population, traffic, facilities) {
  const timestamp = new Date().toISOString();
  
  // 지역별 혼잡도 계산
  for (const area of population) {
    const crowdLevel = calculateCrowdLevel(area.AREA_PPLTN_MIN);
    const noiseLevel = calculateNoiseLevel(traffic, area.AREA_NM);
    
    await dynamodb.put({
      TableName: 'Places',
      Item: {
        id: `${area.AREA_NM}_${Date.now()}`,
        name: area.AREA_NM,
        latitude: parseFloat(area.Y_COORD || 0),
        longitude: parseFloat(area.X_COORD || 0),
        crowdLevel,
        noiseLevel,
        population: parseInt(area.AREA_PPLTN_MIN || 0),
        timestamp,
        type: 'area'
      }
    }).promise();
  }
}

function calculateCrowdLevel(population) {
  const pop = parseInt(population || 0);
  if (pop < 1000) return 'low';
  if (pop < 5000) return 'medium';
  return 'high';
}

function calculateNoiseLevel(trafficData, areaName) {
  const areaTraffic = trafficData.find(t => 
    t.ROAD_NM && t.ROAD_NM.includes(areaName.split(' ')[0])
  );
  
  if (!areaTraffic) return 'low';
  
  const speed = parseFloat(areaTraffic.AVG_SPD || 50);
  if (speed > 40) return 'low';
  if (speed > 20) return 'medium';
  return 'high';
}
