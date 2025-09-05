const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

// Korean comment templates
const COMMENT_TEMPLATES = [
    '정말 조용하고 좋은 곳이네요! 자주 올 것 같아요.',
    '소음이 거의 없어서 집중하기 딱 좋습니다.',
    '분위기가 너무 좋아요. 힐링되는 공간이에요.',
    '혼자 와서 책 읽기에 완벽한 장소입니다.',
    '도심 속에서 이런 조용한 곳을 찾기 어려운데 감사해요.',
    '스트레스가 확실히 풀리는 곳이에요. 추천!',
    '사람이 많지 않아서 여유롭게 시간 보낼 수 있어요.',
    '조용한 음악과 함께 편안한 시간을 보냈습니다.',
    '생각 정리하기에 정말 좋은 공간이네요.',
    '소음에 민감한 저에게는 천국 같은 곳이에요.',
    '평화로운 분위기가 마음을 편안하게 해줍니다.',
    '집중이 필요할 때 찾는 나만의 비밀 장소가 될 것 같아요.',
    '조용하면서도 아늑한 분위기가 일품입니다.',
    '도시의 소음에서 벗어나 힐링할 수 있어요.',
    '깔끔하고 조용해서 마음이 편안해져요.',
    '여기서 보낸 시간이 정말 소중했습니다.',
    '조용함의 진정한 의미를 느낄 수 있는 곳이에요.',
    '편안한 의자와 조용한 환경이 완벽해요.',
    '스마트폰 없이도 충분히 즐길 수 있는 공간입니다.',
    '자연스럽게 마음이 차분해지는 곳이네요.',
    '조용한 분위기 덕분에 깊은 사색을 할 수 있었어요.',
    '소음 걱정 없이 편안하게 쉴 수 있어서 좋아요.',
    '이런 곳이 더 많아졌으면 좋겠어요.',
    '친구들에게도 꼭 추천하고 싶은 장소입니다.',
    '조용하고 깨끗해서 자주 오게 될 것 같아요.',
    '평온함을 찾고 있다면 이곳을 추천해요.',
    '소음 레벨이 낮아서 정말 만족스럽습니다.',
    '혼자만의 시간을 갖기에 딱 좋은 곳이에요.',
    '분위기 있는 조명과 조용한 환경이 최고예요.',
    '마음의 평화를 찾을 수 있는 소중한 공간입니다.',
    '조용한 음악이 흘러나와서 더욱 편안해요.',
    '도심 속 오아시스 같은 곳이네요.',
    '집중력이 필요한 작업을 할 때 최적의 장소예요.',
    '조용하면서도 따뜻한 분위기가 좋아요.',
    '소음에 예민한 분들께 강력 추천합니다.',
    '평화로운 시간을 보낼 수 있어서 감사해요.',
    '조용함 속에서 진정한 휴식을 취할 수 있어요.',
    '이곳에서의 시간이 정말 소중하고 의미있었어요.',
    '조용한 환경 덕분에 마음이 정화되는 느낌이에요.',
    '소음 없는 평온한 공간을 찾고 있다면 여기예요!',
    '정말 좋네요! 다음에도 꼭 올게요.',
    '생각보다 더 조용하고 좋았어요.',
    '완전 힐링 공간이에요. 강추!',
    '조용해서 좋긴 한데 좀 더 밝았으면 어떨까요?',
    '분위기는 좋은데 의자가 좀 불편해요.',
    '전체적으로 만족스럽지만 가격이 조금 아쉬워요.',
    '조용하긴 한데 너무 조용해서 오히려 어색했어요.',
    '좋은 곳이지만 접근성이 좀 아쉽네요.',
    '분위기 좋고 조용한데 화장실이 좀 멀어요.',
    '대체로 만족하지만 주차가 어려워요.'
];

// Korean nicknames for anonymous comments
const ANONYMOUS_NICKNAMES = [
    '조용함추구자', '평화로운마음', '힐링러버', '고요한영혼', '잔잔한바다',
    '따뜻한햇살', '부드러운바람', '맑은하늘', '포근한마음', '달콤한휴식',
    '조용한독서가', '평온한시간', '고요한아침', '잔잔한오후', '따뜻한저녁',
    '부드러운조명', '맑은공기', '포근한공간', '달콤한꿈', '조용한산책자',
    '평화주의자', '힐링전문가', '고요함매니아', '잔잔함애호가', '따뜻함추구자',
    '부드러움선호자', '맑음지향자', '포근함러버', '달콤함추구자', '조용함마니아'
];

async function getSpotIds() {
    const result = await dynamodb.scan({
        TableName: 'Spots',
        ProjectionExpression: 'id'
    }).promise();
    return result.Items.map(item => item.id);
}

async function getUserIds() {
    const result = await dynamodb.scan({
        TableName: 'Users',
        ProjectionExpression: 'id'
    }).promise();
    return result.Items.map(item => item.id);
}

async function generateComments(spotIds, userIds) {
    const comments = [];
    
    for (let i = 0; i < 150; i++) {
        const spotId = spotIds[Math.floor(Math.random() * spotIds.length)];
        const content = COMMENT_TEMPLATES[Math.floor(Math.random() * COMMENT_TEMPLATES.length)];
        const nickname = ANONYMOUS_NICKNAMES[Math.floor(Math.random() * ANONYMOUS_NICKNAMES.length)];
        
        // 70% chance to have user_id, 30% anonymous
        const hasUserId = Math.random() > 0.3;
        const userId = hasUserId ? userIds[Math.floor(Math.random() * userIds.length)] : null;
        
        const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(); // Last 3 months
        
        const comment = {
            id: uuidv4(),
            spot_id: spotId,
            user_id: userId,
            nickname: nickname,
            content: content,
            created_at: createdAt
        };
        
        comments.push(comment);
    }
    
    // Sort by created_at for better data distribution
    comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    return comments;
}

async function insertComments(comments) {
    const batchSize = 25;
    
    for (let i = 0; i < comments.length; i += batchSize) {
        const batch = comments.slice(i, i + batchSize);
        
        const params = {
            RequestItems: {
                'Comments': batch.map(comment => ({
                    PutRequest: {
                        Item: comment
                    }
                }))
            }
        };
        
        try {
            await dynamodb.batchWrite(params).promise();
            console.log(`Inserted comments batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(comments.length / batchSize)}`);
        } catch (error) {
            console.error('Error inserting comments batch:', error);
        }
    }
}

async function main() {
    try {
        console.log('Getting spot IDs...');
        const spotIds = await getSpotIds();
        
        if (spotIds.length === 0) {
            throw new Error('No spots found. Please run generate-spots.js first.');
        }
        
        console.log('Getting user IDs...');
        const userIds = await getUserIds();
        
        if (userIds.length === 0) {
            throw new Error('No users found. Please run generate-users.js first.');
        }
        
        console.log(`Found ${spotIds.length} spots and ${userIds.length} users`);
        console.log('Generating 150 dummy comments...');
        const comments = await generateComments(spotIds, userIds);
        
        console.log('Inserting comments into DynamoDB...');
        await insertComments(comments);
        
        console.log('✅ Successfully inserted 150 dummy comments!');
        
        // Save to JSON file for reference
        fs.writeFileSync('./comments-dummy-data.json', JSON.stringify(comments, null, 2));
        console.log('📄 Saved dummy data to comments-dummy-data.json');
        
        // Generate statistics
        const commentsBySpot = {};
        comments.forEach(comment => {
            commentsBySpot[comment.spot_id] = (commentsBySpot[comment.spot_id] || 0) + 1;
        });
        
        const avgCommentsPerSpot = Object.values(commentsBySpot).reduce((a, b) => a + b, 0) / Object.keys(commentsBySpot).length;
        console.log(`📊 Average comments per spot: ${avgCommentsPerSpot.toFixed(1)}`);
        console.log(`📊 Spots with comments: ${Object.keys(commentsBySpot).length}/${spotIds.length}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
