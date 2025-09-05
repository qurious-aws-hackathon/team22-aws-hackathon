import json
import boto3
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
cloudwatch = boto3.client('cloudwatch')

def lambda_handler(event, context):
    try:
        sessions_table = dynamodb.Table('ChatSessions')
        messages_table = dynamodb.Table('ChatMessages')
        
        # Get expired sessions
        current_time = int(datetime.utcnow().timestamp())
        
        # Scan for expired sessions
        response = sessions_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('expiresAt').lt(current_time)
        )
        
        expired_sessions = response['Items']
        cleanup_count = 0
        
        for session in expired_sessions:
            session_id = session['sessionId']
            
            # Delete associated messages
            messages_response = messages_table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key('sessionId').eq(session_id)
            )
            
            # Delete messages in batches
            with messages_table.batch_writer() as batch:
                for message in messages_response['Items']:
                    batch.delete_item(
                        Key={
                            'sessionId': message['sessionId'],
                            'timestamp': message['timestamp']
                        }
                    )
            
            # Delete session
            sessions_table.delete_item(Key={'sessionId': session_id})
            cleanup_count += 1
        
        # Send metrics to CloudWatch
        cloudwatch.put_metric_data(
            Namespace='ShitPlace/ChatBot',
            MetricData=[
                {
                    'MetricName': 'ExpiredSessionsCleanedUp',
                    'Value': cleanup_count,
                    'Unit': 'Count',
                    'Timestamp': datetime.utcnow()
                }
            ]
        )
        
        # Get active sessions count for monitoring
        active_response = sessions_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('status').eq('active') & 
                           boto3.dynamodb.conditions.Attr('expiresAt').gte(current_time),
            Select='COUNT'
        )
        
        active_count = active_response['Count']
        
        cloudwatch.put_metric_data(
            Namespace='ShitPlace/ChatBot',
            MetricData=[
                {
                    'MetricName': 'ActiveSessions',
                    'Value': active_count,
                    'Unit': 'Count',
                    'Timestamp': datetime.utcnow()
                }
            ]
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Cleaned up {cleanup_count} expired sessions',
                'activeSessions': active_count
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
