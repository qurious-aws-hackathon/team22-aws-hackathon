const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

// Seoul area coordinates (approximate bounds)
const SEOUL_BOUNDS = {
    north: 37.7,
    south: 37.4,
    east: 127.2,
    west: 126.8
};

// Korean spot names by category
const SPOT_DATA = {
    '카페': [
        '조용한 북카페', '힐링 카페', '평온한 시간', '고요한 아침', '잔잔한 오후',
        '따뜻한 햇살 카페', '부드러운 바람', '맑은 하늘 카페', '포근한 공간', '달콤한 휴식',
        '조용한 서재', '평화로운 마음', '고요한 정원', '잔잔한 음악', '따뜻한 차',
        '부드러운 조명', '맑은 공기', '포근한 소파', '달콤한 디저트', '조용한 모퉁이'
    ],
    '도서관': [
        '조용한 열람실', '평화로운 서재', '고요한 학습공간', '잔잔한 독서실', '따뜻한 도서관',
        '부드러운 조명 열람실', '맑은 공기 도서관', '포근한 학습실', '달콤한 독서 공간', '조용한 구석'
    ],
    '공원': [
        '평화로운 산책로', '고요한 벤치', '잔잔한 연못가', '따뜻한 햇살 아래', '부드러운 잔디밭',
        '맑은 공기 숲길', '포근한 그늘', '달콤한 꽃향기', '조용한 정자', '평온한 쉼터',
        '고요한 나무 그늘', '잔잔한 분수대', '따뜻한 벤치', '부드러운 바람길', '맑은 하늘 아래'
    ],
    '기타': [
        '조용한 갤러리', '평화로운 박물관', '고요한 전시관', '잔잔한 아트센터', '따뜻한 문화공간',
        '부드러운 조명 갤러리', '맑은 전망대', '포근한 휴게실', '달콤한 카페테리아', '조용한 로비'
    ]
};

const DESCRIPTIONS = [
    '정말 조용하고 평화로운 곳입니다. 혼자만의 시간을 갖기에 완벽해요.',
    '소음이 거의 없어서 집중하기 좋습니다. 강력 추천!',
    '도심 속 숨겨진 보석 같은 장소예요. 조용하고 아늑합니다.',
    '사람이 많지 않아서 여유롭게 시간을 보낼 수 있어요.',
    '분위기가 너무 좋고 조용해서 자주 오게 되는 곳입니다.',
    '스트레스 해소하기에 딱 좋은 조용한 공간이에요.',
    '책 읽기나 공부하기에 최적의 환경입니다.',
    '조용하면서도 편안한 분위기가 일품인 곳이에요.',
    '혼자 와서 생각 정리하기 좋은 평화로운 장소입니다.',
    '소음 걱정 없이 편안하게 쉴 수 있는 힐링 스팟이에요.',
    '조용한 음악과 함께 여유로운 시간을 보낼 수 있어요.',
    '도시의 소음에서 벗어나 평온함을 느낄 수 있는 곳입니다.',
    '집중이 필요할 때 찾는 나만의 비밀 장소예요.',
    '조용하고 깔끔해서 마음이 편안해지는 공간입니다.',
    '소음 레벨이 낮아서 민감한 분들께도 추천해요.'
];

function geohash(lat, lng, precision = 7) {
    const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let latRange = [-90, 90];
    let lngRange = [-180, 180];
    let hash = '';
    let bit = 0;
    let ch = 0;
    let even = true;

    while (hash.length < precision) {
        if (even) {
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
        even = !even;
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

function randomSeoulCoordinate() {
    const lat = SEOUL_BOUNDS.south + Math.random() * (SEOUL_BOUNDS.north - SEOUL_BOUNDS.south);
    const lng = SEOUL_BOUNDS.west + Math.random() * (SEOUL_BOUNDS.east - SEOUL_BOUNDS.west);
    return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

async function getRandomUsers() {
    const result = await dynamodb.scan({
        TableName: 'Users',
        ProjectionExpression: 'id'
    }).promise();
    return result.Items.map(item => item.id);
}

async function generateSpots(userIds) {
    const spots = [];
    const categories = Object.keys(SPOT_DATA);
    
    for (let i = 0; i < 50; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const names = SPOT_DATA[category];
        const name = names[Math.floor(Math.random() * names.length)];
        const description = DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)];
        const coords = randomSeoulCoordinate();
        
        const now = new Date().toISOString();
        const createdAt = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(); // Last 6 months
        
        const spot = {
            id: uuidv4(),
            user_id: userIds[Math.floor(Math.random() * userIds.length)],
            lat: coords.lat,
            lng: coords.lng,
            name: name,
            description: description,
            category: category,
            noise_level: Math.floor(Math.random() * 30) + 25, // 25-54 dB (quiet range)
            quiet_rating: Math.floor(Math.random() * 30) + 70, // 70-99 (high quiet rating)
            rating: Number((Math.random() * 2 + 3).toFixed(1)), // 3.0-5.0
            like_count: Math.floor(Math.random() * 20),
            dislike_count: Math.floor(Math.random() * 3),
            is_noise_recorded: Math.random() > 0.7, // 30% chance
            image_url: null, // Nullable image URL field
            created_at: createdAt,
            updated_at: createdAt,
            geohash: geohash(coords.lat, coords.lng)
        };
        
        spots.push(spot);
    }
    
    return spots;
}

async function insertSpots(spots) {
    const batchSize = 25;
    
    for (let i = 0; i < spots.length; i += batchSize) {
        const batch = spots.slice(i, i + batchSize);
        
        const params = {
            RequestItems: {
                'Spots': batch.map(spot => ({
                    PutRequest: {
                        Item: spot
                    }
                }))
            }
        };
        
        try {
            await dynamodb.batchWrite(params).promise();
            console.log(`Inserted spots batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(spots.length / batchSize)}`);
        } catch (error) {
            console.error('Error inserting spots batch:', error);
        }
    }
}

async function main() {
    try {
        console.log('Getting user IDs...');
        const userIds = await getRandomUsers();
        
        if (userIds.length === 0) {
            throw new Error('No users found. Please run generate-users.js first.');
        }
        
        console.log(`Found ${userIds.length} users`);
        console.log('Generating 50 dummy spots in Seoul...');
        const spots = await generateSpots(userIds);
        
        console.log('Inserting spots into DynamoDB...');
        await insertSpots(spots);
        
        console.log('✅ Successfully inserted 50 dummy spots!');
        
        // Save to JSON file for reference
        fs.writeFileSync('./spots-dummy-data.json', JSON.stringify(spots, null, 2));
        console.log('📄 Saved dummy data to spots-dummy-data.json');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
