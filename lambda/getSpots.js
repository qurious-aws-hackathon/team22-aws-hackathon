const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        console.log('Getting spots...');
        
        // Spots 테이블에서 모든 장소 조회
        const spotsCommand = new ScanCommand({
            TableName: 'Spots'
        });
        
        const spotsResult = await docClient.send(spotsCommand);
        const spots = spotsResult.Items || [];
        
        console.log(`Found ${spots.length} spots`);
        
        // 각 spot에 대해 닉네임 조회 및 추가
        const spotsWithNicknames = await Promise.all(
            spots.map(async (spot) => {
                let nickname = '익명';
                
                if (spot.user_id && spot.user_id !== 'anonymous') {
                    try {
                        // Users 테이블에서 닉네임 조회
                        const userCommand = new GetCommand({
                            TableName: 'Users',
                            Key: { id: spot.user_id }
                        });
                        
                        const userResult = await docClient.send(userCommand);
                        if (userResult.Item && userResult.Item.nickname) {
                            nickname = userResult.Item.nickname;
                        }
                    } catch (error) {
                        console.error(`Failed to get nickname for user ${spot.user_id}:`, error);
                        // 실패해도 계속 진행
                    }
                }
                
                return {
                    ...spot,
                    user_nickname: nickname
                };
            })
        );
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                spots: spotsWithNicknames,
                count: spotsWithNicknames.length
            })
        };
        
    } catch (error) {
        console.error('Get spots error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: '장소 목록을 가져오는데 실패했습니다.',
                message: error.message
            })
        };
    }
};