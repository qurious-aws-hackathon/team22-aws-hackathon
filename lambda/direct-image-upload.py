import json
import boto3
import base64
import uuid
from datetime import datetime
import os

s3 = boto3.client('s3')

BUCKET_NAME = 'image-upload-533266989224'
IMAGES_DIR = 'images'

def lambda_handler(event, context):
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Get image data
        image_data = body.get('image')
        file_name = body.get('fileName', f'spot-image-{uuid.uuid4()}.jpg')
        content_type = body.get('contentType', 'image/jpeg')
        
        if not image_data:
            return error_response(400, 'Image data is required')
        
        # Decode base64 image
        try:
            # Remove data URL prefix if present
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            return error_response(400, f'Invalid image data: {str(e)}')
        
        # Generate unique file name
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        file_extension = file_name.split('.')[-1] if '.' in file_name else 'jpg'
        s3_key = f'{IMAGES_DIR}/spot_{timestamp}_{unique_id}.{file_extension}'
        
        # Upload to S3
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=image_bytes,
            ContentType=content_type
        )
        
        # Generate public URL
        image_url = f'https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}'
        
        print(f"Image uploaded successfully: {image_url}")
        
        return success_response({
            'imageUrl': image_url,
            'key': s3_key,
            'bucket': BUCKET_NAME
        })
        
    except Exception as e:
        print(f"Error uploading image: {str(e)}")
        return error_response(500, f'Failed to upload image: {str(e)}')

def success_response(data):
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps(data, ensure_ascii=False)
    }

def error_response(status_code, message):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps({'error': message}, ensure_ascii=False)
    }
