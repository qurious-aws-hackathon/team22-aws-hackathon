const AWS = require('aws-sdk');
const axios = require('axios');

const dynamodb = new AWS.DynamoDB.DocumentClient();

// 행정동 코드 매핑 데이터
const AREA_CODE_MAP = {
  '11110515': { name: '청운효자동', lat: 37.5816, lng: 126.9685 },
  '11110530': { name: '사직동', lat: 37.5751, lng: 126.9730 },
  '11110540': { name: '삼청동', lat: 37.5816, lng: 126.9816 },
  '11110550': { name: '부암동', lat: 37.5902, lng: 126.9634 },
  '11110560': { name: '평창동', lat: 37.6063, lng: 126.9668 },
  '11110570': { name: '무악동', lat: 37.5816, lng: 126.9568 },
  '11110580': { name: '교남동', lat: 37.5751, lng: 126.9568 },
  '11110600': { name: '가회동', lat: 37.5816, lng: 126.9851 },
  '11110615': { name: '종로1·2·3·4가동', lat: 37.5701, lng: 126.9816 },
  '11110630': { name: '종로5·6가동', lat: 37.5701, lng: 126.9916 },
  '11110640': { name: '이화동', lat: 37.5816, lng: 126.9916 },
  '11110650': { name: '혜화동', lat: 37.5816, lng: 127.0016 },
  '11110670': { name: '명륜3가동', lat: 37.5816, lng: 127.0116 },
  '11110680': { name: '창신1동', lat: 37.5816, lng: 127.0216 },
  '11110690': { name: '창신2동', lat: 37.5816, lng: 127.0316 },
  '11110700': { name: '창신3동', lat: 37.5816, lng: 127.0416 },
  '11110710': { name: '숭인1동', lat: 37.5816, lng: 127.0516 },
  '11140520': { name: '소공동', lat: 37.5636, lng: 126.9779 },
  '11140540': { name: '회현동', lat: 37.5586, lng: 126.9779 },
  '11140550': { name: '명동', lat: 37.5636, lng: 126.9879 },
  '11140570': { name: '필동', lat: 37.5586, lng: 126.9879 },
  '11140580': { name: '장충동', lat: 37.5536, lng: 126.9879 },
  '11140590': { name: '광희동', lat: 37.5586, lng: 126.9979 },
  '11140605': { name: '을지로동', lat: 37.5636, lng: 127.0079 },
  '11140615': { name: '신당동', lat: 37.5586, lng: 127.0179 },
  '11140625': { name: '다산동', lat: 37.5536, lng: 127.0179 },
  '11140635': { name: '약수동', lat: 37.5486, lng: 127.0179 },
  '11140645': { name: '청구동', lat: 37.5436, lng: 127.0179 },
  '11140650': { name: '신당5동', lat: 37.5386, lng: 127.0179 },
  '11140665': { name: '동화동', lat: 37.5336, lng: 127.0179 },
  '11140670': { name: '황학동', lat: 37.5286, lng: 127.0179 },
  '11140680': { name: '중림동', lat: 37.5236, lng: 127.0179 },
  '11170510': { name: '후암동', lat: 37.5486, lng: 126.9779 },
  '11170520': { name: '용산2가동', lat: 37.5436, lng: 126.9779 },
  '11170530': { name: '남영동', lat: 37.5386, lng: 126.9779 },
  '11170555': { name: '청파동', lat: 37.5336, lng: 126.9779 },
  '11170560': { name: '원효로1동', lat: 37.5286, lng: 126.9779 },
  '11170570': { name: '원효로2동', lat: 37.5236, lng: 126.9779 },
  '11170580': { name: '효창동', lat: 37.5186, lng: 126.9779 },
  '11170590': { name: '용문동', lat: 37.5136, lng: 126.9779 },
  '11170625': { name: '한남동', lat: 37.5336, lng: 127.0079 },
  '11170630': { name: '이촌1동', lat: 37.5236, lng: 127.0079 },
  '11170640': { name: '이촌2동', lat: 37.5186, lng: 127.0079 },
  '11170650': { name: '이태원1동', lat: 37.5336, lng: 127.0179 },
  '11170660': { name: '이태원2동', lat: 37.5286, lng: 127.0179 },
  '11170685': { name: '한강로동', lat: 37.5236, lng: 127.0179 },
  '11170690': { name: '서빙고동', lat: 37.5186, lng: 127.0179 },
  '11170700': { name: '보광동', lat: 37.5136, lng: 127.0179 },
  '11200520': { name: '왕십리도선동', lat: 37.5636, lng: 127.0379 },
  '11200535': { name: '왕십리2동', lat: 37.5586, lng: 127.0379 },
  '11200540': { name: '마장동', lat: 37.5536, lng: 127.0379 },
  '11200550': { name: '사근동', lat: 37.5486, lng: 127.0379 },
  '11200560': { name: '행당1동', lat: 37.5436, lng: 127.0379 },
  '11200570': { name: '행당2동', lat: 37.5386, lng: 127.0379 },
  '11200580': { name: '응봉동', lat: 37.5336, lng: 127.0379 },
  '11200590': { name: '금고1가동', lat: 37.5286, lng: 127.0379 },
  '11200615': { name: '금고2·3가동', lat: 37.5236, lng: 127.0379 },
  '11200620': { name: '금고4가동', lat: 37.5186, lng: 127.0379 },
  '11200645': { name: '옥수동', lat: 37.5136, lng: 127.0379 },
  '11200650': { name: '성수1가1동', lat: 37.5086, lng: 127.0379 },
  '11200660': { name: '성수1가2동', lat: 37.5036, lng: 127.0379 },
  '11200670': { name: '성수2가1동', lat: 37.4986, lng: 127.0379 },
  '11200690': { name: '성수2가3동', lat: 37.4936, lng: 127.0379 },
  '11200720': { name: '송정동', lat: 37.4886, lng: 127.0379 },
  '11200790': { name: '용답동', lat: 37.4836, lng: 127.0379 },
  '11215710': { name: '화양동', lat: 37.5436, lng: 127.0679 },
  '11215730': { name: '군자동', lat: 37.5386, lng: 127.0679 },
  '11215740': { name: '중곡1동', lat: 37.5336, lng: 127.0679 },
  '11215750': { name: '중곡2동', lat: 37.5286, lng: 127.0679 },
  '11215760': { name: '중곡3동', lat: 37.5236, lng: 127.0679 },
  '11215770': { name: '중곡4동', lat: 37.5186, lng: 127.0679 },
  '11215780': { name: '능동', lat: 37.5136, lng: 127.0679 },
  '11215810': { name: '구의1동', lat: 37.5086, lng: 127.0679 },
  '11215820': { name: '구의2동', lat: 37.5036, lng: 127.0679 },
  '11215830': { name: '구의3동', lat: 37.4986, lng: 127.0679 },
  '11215840': { name: '광장동', lat: 37.4936, lng: 127.0679 },
  '11215847': { name: '자양1동', lat: 37.4886, lng: 127.0679 },
  '11215850': { name: '자양2동', lat: 37.4836, lng: 127.0679 },
  '11215860': { name: '자양3동', lat: 37.4786, lng: 127.0679 },
  '11215870': { name: '자양4동', lat: 37.4736, lng: 127.0679 },
  '11230536': { name: '신사동', lat: 37.5236, lng: 127.0279 },
  '11230545': { name: '논현1동', lat: 37.5186, lng: 127.0279 }
};

// 행정동 코드로 지역 정보 조회
function getAreaInfo(areaCode) {
  const areaInfo = AREA_CODE_MAP[areaCode];
  if (areaInfo) {
    return areaInfo;
  }
  
  const guCode = areaCode.substring(0, 5);
  const guMap = {
    '11110': { name: '종로구', lat: 37.5735, lng: 126.9788 },
    '11140': { name: '중구', lat: 37.5641, lng: 126.9979 },
    '11170': { name: '용산구', lat: 37.5326, lng: 126.9900 },
    '11200': { name: '성동구', lat: 37.5636, lng: 127.0365 },
    '11215': { name: '광진구', lat: 37.5384, lng: 127.0822 },
    '11230': { name: '강남구', lat: 37.5173, lng: 127.0473 }
  };
  
  return guMap[guCode] || { name: `지역코드_${areaCode}`, lat: 37.5665, lng: 126.9780 };
}

// GeoHash 생성 (간단한 버전)
function generateGeoHash(lat, lng, precision = 7) {
  const latRange = [-90, 90];
  const lngRange = [-180, 180];
  let hash = '';
  let isEven = true;
  let bit = 0;
  let ch = 0;
  
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  
  while (hash.length < precision) {
    if (isEven) {
      const mid = (lngRange[0] + lngRange[1]) / 2;
      if (lng >= mid) {
        ch |= (1 << (4 - bit));
        lngRange[0] = mid;
      } else {
        lngRange[1] = mid;
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (lat >= mid) {
        ch |= (1 << (4 - bit));
        latRange[0] = mid;
      } else {
        latRange[1] = mid;
      }
    }
    
    isEven = !isEven;
    
    if (bit < 4) {
      bit++;
    } else {
      hash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }
  
  return hash;
}

// 서울시 API 호출
async function fetchSeoulAPI() {
  const apiKey = process.env.SEOUL_API_KEY;
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/SPOP_LOCAL_RESD_DONG/1/100/`;
  
  console.log('Fetching data from Seoul API:', url);
  
  const response = await axios.get(url, { timeout: 15000 });
  
  if (response.data && response.data.SPOP_LOCAL_RESD_DONG && response.data.SPOP_LOCAL_RESD_DONG.row) {
    return response.data.SPOP_LOCAL_RESD_DONG.row;
  } else {
    throw new Error('Invalid Seoul API response structure');
  }
}

// 데이터 변환 및 매핑
function processSeoulData(rawData) {
  const timestamp = new Date().toISOString();
  const timestampHour = new Date().toISOString().substring(0, 13) + ':00:00.000Z'; // 시간 단위로 정규화
  
  return rawData.map((item, index) => {
    const population = parseInt(item.TOT_LVPOP_CO || 0);
    const areaCode = item.ADSTRD_CODE_SE || '';
    const areaInfo = getAreaInfo(areaCode);
    
    const crowdLevel = population < 3000 ? 0 : population < 8000 ? 1 : 2;
    const noiseLevel = population < 5000 ? 0 : population < 10000 ? 1 : 2;
    const geoHash = generateGeoHash(areaInfo.lat, areaInfo.lng);
    
    return {
      areaCode: areaCode,
      timestamp: timestampHour,
      name: areaInfo.name,
      lat: areaInfo.lat,
      lng: areaInfo.lng,
      population: population,
      noiseLevel: noiseLevel,
      crowdLevel: crowdLevel,
      geoHash: geoHash,
      category: "실시간 데이터",
      type: "real_data",
      lastUpdated: timestamp,
      walkingRecommendation: population < 3000 ? "여유로운 산책하기 좋음" : 
                           population < 8000 ? "적당한 활기의 거리 산책" : "사람 많은 번화가",
      dataSource: "서울 열린데이터광장",
      updateTime: item.STDR_DE_ID || '',
      ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24시간 TTL
    };
  });
}

// DynamoDB에 배치 저장
async function saveToDynamoDB(processedData) {
  const tableName = process.env.PLACES_CURRENT_TABLE || 'PlacesCurrent';
  
  // 25개씩 배치로 나누어 저장 (DynamoDB 제한)
  const batchSize = 25;
  const batches = [];
  
  for (let i = 0; i < processedData.length; i += batchSize) {
    batches.push(processedData.slice(i, i + batchSize));
  }
  
  console.log(`Saving ${processedData.length} records in ${batches.length} batches`);
  
  for (const batch of batches) {
    const params = {
      RequestItems: {
        [tableName]: batch.map((item, index) => ({
          PutRequest: {
            Item: {
              place_id: item.areaCode, // Primary key
              current: 'latest', // Sort key
              geohash: item.geoHash,
              lastUpdated: item.lastUpdated,
              name: item.name,
              lat: item.lat,
              lng: item.lng,
              population: item.population,
              noiseLevel: item.noiseLevel,
              crowdLevel: item.crowdLevel,
              category: item.category,
              type: item.type,
              walkingRecommendation: item.walkingRecommendation,
              dataSource: item.dataSource,
              areaCode: item.areaCode,
              updateTime: item.updateTime,
              ttl: item.ttl
            }
          }
        }))
      }
    };
    
    await dynamodb.batchWrite(params).promise();
    console.log(`Saved batch of ${batch.length} records`);
  }
}

exports.handler = async (event) => {
  try {
    console.log('Starting data collection process');
    
    // 1. 서울시 API 호출
    const seoulData = await fetchSeoulAPI();
    console.log(`Fetched ${seoulData.length} records from Seoul API`);
    
    // 2. 데이터 변환 및 매핑
    const processedData = processSeoulData(seoulData);
    console.log(`Processed ${processedData.length} records`);
    
    // 3. DynamoDB 배치 저장
    await saveToDynamoDB(processedData);
    console.log('Data saved to DynamoDB successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Data collection completed successfully',
        recordsProcessed: processedData.length,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Data collection failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Data collection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
