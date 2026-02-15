from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os

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

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_to_nextjs(path: str, request: Request):
    """Proxy all /api/* requests to Next.js server"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Build the target URL
        url = f"{NEXTJS_URL}/api/{path}"
        
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
                media_type=response.headers.get('content-type', 'application/json')
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
