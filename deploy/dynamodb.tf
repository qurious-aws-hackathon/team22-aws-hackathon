# DynamoDB Tables for ShushPlace Application

resource "aws_dynamodb_table" "spots" {
  name           = "Spots"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "users" {
  name           = "Users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "comments" {
  name           = "Comments"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "spot_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "SpotCommentsIndex"
    hash_key        = "spot_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "spot_likes" {
  name           = "SpotLikes"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "spot_id"
  range_key      = "user_id"

  attribute {
    name = "spot_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "spot_reactions" {
  name           = "SpotReactions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "spot_id"
  range_key      = "user_id"

  attribute {
    name = "spot_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "chat_messages" {
  name           = "ChatMessages"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "sessionId"
  range_key      = "timestamp"

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "chat_sessions" {
  name           = "ChatSessions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "sessionId"

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "N"
  }

  global_secondary_index {
    name            = "userId-createdAt-index"
    hash_key        = "userId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "image_metadata" {
  name           = "ImageMetadata"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "imageId"

  attribute {
    name = "imageId"
    type = "S"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "shitplace_image_metadata" {
  name           = "shitplace-ImageMetadata"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "imageId"

  attribute {
    name = "imageId"
    type = "S"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "file_metadata" {
  name           = "FileMetadata"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "fileId"

  attribute {
    name = "fileId"
    type = "S"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

# Population and crowd data tables
resource "aws_dynamodb_table" "places_current" {
  name           = "PlacesCurrent"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "place_id"

  attribute {
    name = "place_id"
    type = "S"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "places_history" {
  name           = "PlacesHistory"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "place_id"
  range_key      = "timestamp"

  attribute {
    name = "place_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "realtime_crowd_data" {
  name           = "RealtimeCrowdData"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "location_id"

  attribute {
    name = "location_id"
    type = "S"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}

resource "aws_dynamodb_table" "realtime_population_data" {
  name           = "RealtimePopulationData"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "area_id"

  attribute {
    name = "area_id"
    type = "S"
  }

  deletion_protection_enabled = true
  tags = local.common_tags
}
