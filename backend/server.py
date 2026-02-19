from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
import httpx
import os
import json
from typing import Dict, Set
from dataclasses import dataclass, field

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Next.js server URL (internal)
NEXTJS_URL = "http://localhost:3000"

# WebRTC Signaling Server State
class SignalingServer:
    def __init__(self):
        # user_id -> websocket
        self.connections: Dict[str, WebSocket] = {}
        # room_id -> set of user_ids
        self.rooms: Dict[str, Set[str]] = {}
        # user_id -> room_id
        self.user_rooms: Dict[str, str] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.connections[user_id] = websocket
        print(f"User {user_id} connected to signaling server")
    
    def disconnect(self, user_id: str):
        if user_id in self.connections:
            del self.connections[user_id]
        
        # Leave any room
        if user_id in self.user_rooms:
            room_id = self.user_rooms[user_id]
            if room_id in self.rooms:
                self.rooms[room_id].discard(user_id)
                if len(self.rooms[room_id]) == 0:
                    del self.rooms[room_id]
            del self.user_rooms[user_id]
        
        print(f"User {user_id} disconnected from signaling server")
    
    async def join_room(self, user_id: str, room_id: str):
        # Leave current room if any
        if user_id in self.user_rooms:
            await self.leave_room(user_id)
        
        # Join new room
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        
        self.rooms[room_id].add(user_id)
        self.user_rooms[user_id] = room_id
        
        # Notify other users in the room
        for other_user in self.rooms[room_id]:
            if other_user != user_id and other_user in self.connections:
                await self.connections[other_user].send_json({
                    "type": "user_joined",
                    "user_id": user_id,
                    "room_id": room_id
                })
        
        print(f"User {user_id} joined room {room_id}")
        return list(self.rooms[room_id] - {user_id})
    
    async def leave_room(self, user_id: str):
        if user_id not in self.user_rooms:
            return
        
        room_id = self.user_rooms[user_id]
        
        # Notify other users
        if room_id in self.rooms:
            for other_user in self.rooms[room_id]:
                if other_user != user_id and other_user in self.connections:
                    await self.connections[other_user].send_json({
                        "type": "user_left",
                        "user_id": user_id,
                        "room_id": room_id
                    })
            
            self.rooms[room_id].discard(user_id)
            if len(self.rooms[room_id]) == 0:
                del self.rooms[room_id]
        
        del self.user_rooms[user_id]
        print(f"User {user_id} left room {room_id}")
    
    async def send_to_user(self, target_user_id: str, message: dict):
        if target_user_id in self.connections:
            await self.connections[target_user_id].send_json(message)
            return True
        return False

signaling = SignalingServer()

# WebSocket endpoint for video call signaling (both with and without /api prefix for compatibility)
@app.websocket("/ws/signaling/{user_id}")
@app.websocket("/api/ws/signaling/{user_id}")
async def websocket_signaling(websocket: WebSocket, user_id: str):
    await signaling.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "join_room":
                room_id = data.get("room_id")
                if room_id:
                    users_in_room = await signaling.join_room(user_id, room_id)
                    await websocket.send_json({
                        "type": "room_joined",
                        "room_id": room_id,
                        "users": users_in_room
                    })
            
            elif message_type == "leave_room":
                await signaling.leave_room(user_id)
                await websocket.send_json({
                    "type": "room_left"
                })
            
            elif message_type == "offer":
                # Forward SDP offer to target user
                target_user = data.get("target")
                if target_user:
                    await signaling.send_to_user(target_user, {
                        "type": "offer",
                        "offer": data.get("offer"),
                        "from": user_id
                    })
            
            elif message_type == "answer":
                # Forward SDP answer to target user
                target_user = data.get("target")
                if target_user:
                    await signaling.send_to_user(target_user, {
                        "type": "answer",
                        "answer": data.get("answer"),
                        "from": user_id
                    })
            
            elif message_type == "ice_candidate":
                # Forward ICE candidate to target user
                target_user = data.get("target")
                if target_user:
                    await signaling.send_to_user(target_user, {
                        "type": "ice_candidate",
                        "candidate": data.get("candidate"),
                        "from": user_id
                    })
            
            elif message_type == "call_user":
                # Initiate a call to another user
                target_user = data.get("target")
                call_type = data.get("call_type", "video")
                if target_user:
                    await signaling.send_to_user(target_user, {
                        "type": "incoming_call",
                        "from": user_id,
                        "call_type": call_type,
                        "caller_name": data.get("caller_name", "Unknown")
                    })
            
            elif message_type == "call_accepted":
                target_user = data.get("target")
                if target_user:
                    await signaling.send_to_user(target_user, {
                        "type": "call_accepted",
                        "from": user_id
                    })
            
            elif message_type == "call_rejected":
                target_user = data.get("target")
                if target_user:
                    await signaling.send_to_user(target_user, {
                        "type": "call_rejected",
                        "from": user_id
                    })
            
            elif message_type == "call_ended":
                target_user = data.get("target")
                if target_user:
                    await signaling.send_to_user(target_user, {
                        "type": "call_ended",
                        "from": user_id
                    })
            
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        signaling.disconnect(user_id)
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
        signaling.disconnect(user_id)

async def proxy_request(request: Request, path: str):
    """Common proxy logic for all requests"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Build the target URL
        url = f"{NEXTJS_URL}/{path}"
        
        # Get query params
        query_params = str(request.query_params)
        if query_params:
            url = f"{url}?{query_params}"
        
        # Get headers (filter some that shouldn't be proxied)
        headers = {}
        for key, value in request.headers.items():
            if key.lower() not in ['host', 'content-length']:
                headers[key] = value
        
        # Get body for POST/PUT requests
        body = await request.body()
        
        # Forward cookies
        cookies = {}
        for cookie_name, cookie_value in request.cookies.items():
            cookies[cookie_name] = cookie_value
        
        try:
            # Make the proxied request
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body if body else None,
                cookies=cookies,
            )
            
            # Build response
            excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
            response_headers = {
                key: value for key, value in response.headers.items()
                if key.lower() not in excluded_headers
            }
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=response_headers,
                media_type=response.headers.get('content-type', 'text/html')
            )
        except httpx.TimeoutException:
            return Response(
                content='{"error": "Request timeout"}',
                status_code=504,
                media_type='application/json'
            )
        except Exception as e:
            return Response(
                content=f'{{"error": "Proxy error: {str(e)}"}}',
                status_code=502,
                media_type='application/json'
            )

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Proxy all API requests
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_api(path: str, request: Request):
    """Proxy all /api/* requests to Next.js server"""
    return await proxy_request(request, f"api/{path}")

# Proxy Next.js static files
@app.api_route("/_next/{path:path}", methods=["GET"])
async def proxy_next_static(path: str, request: Request):
    """Proxy Next.js static files"""
    return await proxy_request(request, f"_next/{path}")

# Proxy all other requests (pages)
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_pages(path: str, request: Request):
    """Proxy all page requests to Next.js server"""
    return await proxy_request(request, path)

# Handle root path
@app.get("/")
async def proxy_root(request: Request):
    """Proxy root path to Next.js server"""
    return await proxy_request(request, "")
