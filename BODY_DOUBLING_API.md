# Body Doubling API & Webhook Integration Guide

## Overview
This document describes the API endpoints and webhook integration for connecting external body doubling services (Focusmate, Study Together, Flow Club, etc.) with the Neurotype Planner.

## Architecture
```
External Service → Webhook → Neurotype Planner → Database
                                     ↓
                              Real-time Updates
```

## Base URL
```
Production: https://your-domain.com/api/v1
Development: http://localhost:5173/api/v1
```

## Authentication
All API requests require authentication via Bearer token:
```
Authorization: Bearer <your-api-token>
```

Webhook requests include a signature header for verification:
```
X-Webhook-Signature: <hmac-sha256-signature>
```

---

## API Endpoints

### 1. List Rooms
**GET** `/rooms`

Get all available body doubling rooms.

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `scheduled`, `ended`)
- `type` (optional): Filter by type (`video`, `silent`, `audio-only`)
- `is_public` (optional): Filter by visibility (`true`, `false`)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Silent Study Session",
      "description": "Quiet co-working space",
      "room_type": "video",
      "created_by": "uuid",
      "is_public": true,
      "max_participants": 10,
      "current_participants": 4,
      "tags": ["study", "quiet", "focus"],
      "scheduled_start": "2025-11-07T14:00:00Z",
      "scheduled_end": "2025-11-07T16:00:00Z",
      "status": "active",
      "webrtc_room_id": "room-abc123",
      "external_service_id": null,
      "external_service_name": null,
      "created_at": "2025-11-07T10:00:00Z",
      "updated_at": "2025-11-07T10:00:00Z"
    }
  ]
}
```

---

### 2. Get Room
**GET** `/rooms/:roomId`

Get details of a specific room.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Silent Study Session",
    ...
  }
}
```

---

### 3. Create Room
**POST** `/rooms`

Create a new body doubling room.

**Request Body:**
```json
{
  "name": "Morning Focus Session",
  "description": "Early morning productivity",
  "room_type": "video",
  "is_public": true,
  "max_participants": 8,
  "tags": ["morning", "productivity"],
  "scheduled_start": "2025-11-08T08:00:00Z",
  "scheduled_end": "2025-11-08T10:00:00Z",
  "webhook_url": "https://your-service.com/webhooks/neurotype"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Morning Focus Session",
    "status": "scheduled",
    ...
  }
}
```

---

### 4. Update Room
**PATCH** `/rooms/:roomId`

Update room details.

**Request Body:**
```json
{
  "name": "Updated Room Name",
  "max_participants": 12,
  "status": "active"
}
```

---

### 5. End Room
**POST** `/rooms/:roomId/end`

End an active room session.

**Response:**
```json
{
  "success": true,
  "message": "Room ended successfully"
}
```

---

### 6. Join Room
**POST** `/rooms/:roomId/join`

Join a body doubling room.

**Request Body:**
```json
{
  "camera_enabled": true,
  "microphone_enabled": true,
  "peer_id": "peer-xyz789"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "room_id": "uuid",
    "user_id": "uuid",
    "joined_at": "2025-11-07T14:05:00Z",
    "is_active": true,
    "camera_enabled": true,
    "microphone_enabled": true,
    "peer_id": "peer-xyz789"
  }
}
```

---

### 7. Leave Room
**POST** `/rooms/:roomId/leave`

Leave a body doubling room.

**Response:**
```json
{
  "success": true,
  "message": "Left room successfully"
}
```

---

### 8. Get Participants
**GET** `/rooms/:roomId/participants`

Get list of active participants in a room.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "joined_at": "2025-11-07T14:05:00Z",
      "camera_enabled": true,
      "microphone_enabled": false
    }
  ]
}
```

---

### 9. Configure External Service
**POST** `/rooms/:roomId/integrations`

Configure integration with external body doubling service.

**Request Body:**
```json
{
  "service_name": "focusmate",
  "webhook_url": "https://your-service.com/webhooks/neurotype",
  "api_key": "your-api-key",
  "sync_enabled": true
}
```

---

### 10. Sync with External Service
**POST** `/rooms/:roomId/sync`

Sync room with external service.

**Request Body:**
```json
{
  "external_room_id": "fm-session-12345",
  "external_service_name": "focusmate"
}
```

---

## Webhook Events

Neurotype Planner sends webhook notifications for the following events:

### Event Types
1. `room.created` - New room created
2. `room.updated` - Room details updated
3. `room.ended` - Room session ended
4. `participant.joined` - User joined room
5. `participant.left` - User left room

### Webhook Payload Structure
```json
{
  "event": "participant.joined",
  "room_id": "uuid",
  "user_id": "uuid",
  "timestamp": "2025-11-07T14:05:00Z",
  "data": {
    "participant": {
      "id": "uuid",
      "camera_enabled": true,
      "microphone_enabled": false
    }
  }
}
```

### Webhook Security
All webhooks include an `X-Webhook-Signature` header containing an HMAC-SHA256 signature:

```javascript
// Verify webhook signature (Node.js example)
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## Integration Examples

### Focusmate Integration

**1. Create Room from Focusmate Session:**
```javascript
// When Focusmate session is booked
const response = await fetch('https://your-neurotype-api.com/api/v1/rooms', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Focusmate Session',
    description: 'Synced from Focusmate',
    room_type: 'video',
    is_public: false,
    max_participants: 2,
    scheduled_start: session.start_time,
    scheduled_end: session.end_time,
    external_service_id: session.id,
    external_service_name: 'focusmate',
    webhook_url: 'https://your-focusmate-service.com/webhooks/neurotype'
  })
});
```

**2. Handle Neurotype Webhook:**
```javascript
// Webhook endpoint on your Focusmate service
app.post('/webhooks/neurotype', async (req, res) => {
  const { event, room_id, user_id, data } = req.body;
  const signature = req.headers['x-webhook-signature'];
  
  // Verify signature
  if (!verifyWebhook(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Handle event
  switch (event) {
    case 'participant.joined':
      await updateFocusmateSession(room_id, {
        partner_joined: true,
        partner_id: user_id
      });
      break;
      
    case 'room.ended':
      await markFocusmateSessionComplete(room_id);
      break;
  }
  
  res.json({ received: true });
});
```

---

### Study Together Integration

**1. Sync Study Room:**
```javascript
// Create room in Neurotype when Study Together room is created
const createNeurotypeRoom = async (studyRoom) => {
  const response = await fetch('https://your-neurotype-api.com/api/v1/rooms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: studyRoom.name,
      description: studyRoom.description,
      room_type: 'silent',
      is_public: true,
      max_participants: studyRoom.capacity,
      tags: studyRoom.tags,
      external_service_id: studyRoom.id,
      external_service_name: 'study-together',
      webhook_url: 'https://study-together.com/api/webhooks/neurotype'
    })
  });
  
  const { data } = await response.json();
  
  // Store mapping
  await db.roomMappings.create({
    study_together_id: studyRoom.id,
    neurotype_id: data.id
  });
};
```

---

### Flow Club Integration

**1. Bidirectional Sync:**
```javascript
// Flow Club → Neurotype
const syncFlowSession = async (flowSession) => {
  const neurotypeRoom = await createOrUpdateNeurotypeRoom({
    name: flowSession.title,
    room_type: 'video',
    scheduled_start: flowSession.start_time,
    scheduled_end: flowSession.end_time,
    external_service_id: flowSession.id,
    external_service_name: 'flow-club'
  });
  
  // Neurotype → Flow Club webhook handler
  app.post('/webhooks/neurotype', async (req, res) => {
    const { event, data } = req.body;
    
    if (event === 'participant.joined') {
      await flowClubAPI.addParticipant(
        data.room.external_service_id,
        data.participant.user_id
      );
    }
    
    res.json({ received: true });
  });
};
```

---

## Real-time Updates

Subscribe to room changes using Supabase Realtime:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Subscribe to room participants
const channel = supabase
  .channel(`room:${roomId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'room_participants',
      filter: `room_id=eq.${roomId}`
    },
    (payload) => {
      console.log('Participant update:', payload);
      // Update UI with new participant data
    }
  )
  .subscribe();

// Cleanup
channel.unsubscribe();
```

---

## Error Handling

All API endpoints return standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "error": {
    "code": "ROOM_FULL",
    "message": "Room has reached maximum capacity",
    "details": {
      "current_participants": 10,
      "max_participants": 10
    }
  }
}
```

---

## Rate Limits

- API requests: 100 requests per minute per API key
- Webhook deliveries: 3 retry attempts with exponential backoff
- Real-time connections: 50 concurrent connections per user

---

## Testing

### Webhook Testing Tool
Use the provided webhook testing utility:

```bash
# Send test webhook
curl -X POST https://your-service.com/webhooks/test \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d '{
    "event": "participant.joined",
    "room_id": "test-room",
    "user_id": "test-user",
    "timestamp": "2025-11-07T14:00:00Z",
    "data": {}
  }'
```

### Sandbox Environment
Test integrations in sandbox mode:
```
Base URL: https://sandbox.neurotype-planner.com/api/v1
API Key: test_sk_xxxxxxxxxxxxx
```

---

## Support

For integration support, contact:
- Email: api-support@neurotype-planner.com
- Documentation: https://docs.neurotype-planner.com/api
- Discord: https://discord.gg/neurotype-dev

---

## Changelog

### v1.0.0 (2025-11-07)
- Initial API release
- Basic room management endpoints
- Webhook support for 5 event types
- Focusmate, Study Together, Flow Club integration examples
