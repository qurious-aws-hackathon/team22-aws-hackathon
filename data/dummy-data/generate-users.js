const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

// Korean nicknames for realistic dummy data
const koreanNicknames = [
    '조용한산책자', '평화로운마음', '고요한밤', '잔잔한호수', '따뜻한햇살',
    '부드러운바람', '맑은하늘', '깨끗한공기', '신선한아침', '포근한저녁',
    '달콤한꿈', '향긋한꽃', '시원한그늘', '편안한휴식', '자유로운영혼',
    '순수한마음', '깊은생각', '넓은바다', '높은산', '푸른숲',
    '흰구름', '별빛여행자', '달빛산책', '새벽이슬', '노을감상',
    '봄꽃향기', '여름바다', '가을단풍', '겨울눈꽃', '사계절여행',
    '책읽는사람', '음악듣기', '그림그리기', '사진찍기', '요리하기',
    '운동하기', '산책하기', '여행하기', '공부하기', '휴식하기',
    '커피마시기', '차마시기', '영화보기', '드라마보기', '게임하기',
    '친구만나기', '가족시간', '혼자시간', '데이트하기', '쇼핑하기',
    '조용한카페', '평화로운도서관', '고요한공원', '잔잔한강변', '따뜻한집',
    '부드러운침대', '맑은계곡', '깨끗한해변', '신선한공기', '포근한방',
    '달콤한디저트', '향긋한차', '시원한음료', '편안한의자', '자유로운새',
    '순수한아이', '깊은우물', '넓은들판', '높은빌딩', '푸른잔디',
    '흰눈', '별이빛나는밤', '달이밝은밤', '새벽공기', '노을진하늘',
    '봄비', '여름소나기', '가을바람', '겨울눈', '사랑하는사람',
    '책벌레', '음악광', '그림쟁이', '사진작가', '요리사',
    '운동선수', '산책러', '여행가', '학생', '직장인',
    '커피애호가', '차애호가', '영화광', '드라마중독', '게이머',
    '사교적인사람', '가족중심', '독립적인사람', '로맨틱한사람', '쇼핑러버'
];

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function generateUsers() {
    const users = [];
    const usedNicknames = new Set();
    
    for (let i = 0; i < 100; i++) {
        let nickname;
        do {
            nickname = koreanNicknames[Math.floor(Math.random() * koreanNicknames.length)];
            if (usedNicknames.size === koreanNicknames.length) {
                nickname = `${nickname}${Math.floor(Math.random() * 1000)}`;
            }
        } while (usedNicknames.has(nickname));
        
        usedNicknames.add(nickname);
        
        const now = new Date().toISOString();
        const user = {
            id: uuidv4(),
            nickname: nickname,
            password: hashPassword(`password${i + 1}`), // Simple password for dummy data
            created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last year
            updated_at: now
        };
        
        users.push(user);
    }
    
    return users;
}

async function insertUsers(users) {
    const batchSize = 25; // DynamoDB batch write limit
    
    for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        const params = {
            RequestItems: {
                'Users': batch.map(user => ({
                    PutRequest: {
                        Item: user
                    }
                }))
            }
        };
        
        try {
            await dynamodb.batchWrite(params).promise();
            console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}`);
        } catch (error) {
            console.error('Error inserting batch:', error);
        }
    }
}

async function main() {
    try {
        console.log('Generating 100 dummy users...');
        const users = await generateUsers();
        
        console.log('Inserting users into DynamoDB...');
        await insertUsers(users);
        
        console.log('✅ Successfully inserted 100 dummy users!');
        
        // Save to JSON file for reference
        const fs = require('fs');
        fs.writeFileSync('./users-dummy-data.json', JSON.stringify(users, null, 2));
        console.log('📄 Saved dummy data to users-dummy-data.json');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
