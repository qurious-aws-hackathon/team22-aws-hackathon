const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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
        console.log('Event:', JSON.stringify(event));
        
        const spotId = event.pathParameters?.spotId;
        if (!spotId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'spotId가 필요합니다.'
                })
            };
        }
        
        console.log('Deleting spot:', spotId);
        
        const command = new DeleteCommand({
            TableName: 'Spots',
            Key: { id: spotId }
        });
        
        await docClient.send(command);
        console.log('Delete successful');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: '장소가 삭제되었습니다.'
            })
        };
        
    } catch (error) {
        console.error('Delete error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: `장소 삭제에 실패했습니다: ${error.message}`
            })
        };
    }
};