from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from cavista.backend.routes.integration import router as integrations_router
from cavista.backend.utils.gdrive import download_file, download_folder
from clerk_backend_api import Clerk
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import logging

# Load environment variables
load_dotenv()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "YOUR_GOOGLE_CLIENT_SECRET")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")


# Initialize FastAPI app
app = FastAPI(title="Cavista Backend", version="0.1.0")

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Allow all headers for development
ALLOWED_HEADERS = ["*"]

# Define allowed origins
ALLOWED_ORIGINS = ["*"]

# First, handle preflight requests
@app.options("/{full_path:path}")
async def options_handler(request: Request):
    logger.debug("Handling OPTIONS request for path: %s", request.url.path)
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("Origin", ALLOWED_ORIGINS[0]),
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

# Then add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8080/api/v1/integrations/callback")

# Initialize Clerk
clerk = Clerk(bearer_auth=CLERK_SECRET_KEY)

# Include routers
app.include_router(integrations_router, prefix="/api/v1/integrations", tags=["integrations"])

app.mount("/downloads", StaticFiles(directory="cavista/backend/data"), name="downloads")

# Add a middleware to log all requests
@app.middleware("http")
async def final_cors_fix(request: Request, call_next):
    logger.debug(f"Processing request: {request.method} {request.url.path}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    
    response = await call_next(request)
    
    # Add wildcard CORS headers to all responses
    response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    logger.debug(f"Response headers: {dict(response.headers)}")
    return response

# Add authentication middleware
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    logger.debug(f"1. Incoming request: {request.method} {request.url.path}")
    logger.debug(f"2. Request headers: {dict(request.headers)}")
    
    if request.method == "OPTIONS":
        logger.debug("3. Processing OPTIONS request")
        response = await call_next(request)
        origin = request.headers.get("Origin", "http://localhost:5173")
        response.headers.update({
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        })
        logger.debug(f"4. OPTIONS response headers: {dict(response.headers)}")
        return response
        
    # Skip auth for specific endpoints
    if request.url.path in ["/", "/api/v1/integrations/auth"]:
        logger.debug(f"5. Skipping auth for path: {request.url.path}")
        response = await call_next(request)
        # Add CORS headers for non-OPTIONS requests too
        origin = request.headers.get("Origin", "http://localhost:5173")
        response.headers.update({
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        })
        return response
    
    try:
        auth_header = request.headers.get("Authorization")
        logger.debug(f"6. Auth header present: {bool(auth_header)}")
        
        if not auth_header:
            logger.debug("7. No auth header found - returning 401")
            return JSONResponse(
                status_code=401,
                content={"detail": "No authorization header"}
            )
        
        # Extract token
        token = auth_header.split(" ")[1] if " " in auth_header else auth_header
        logger.debug("8. Token extracted successfully")
        
        try:
            # Verify token
            logger.debug("9. Attempting to verify token with Clerk")
            clerk.sessions.verify_session(session_token=token)
            logger.debug("10. Token verification successful")
        except Exception as e:
            logger.error(f"11. Token verification failed: {str(e)}")
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid token"}
            )
        
        logger.debug("12. Proceeding with request")
        response = await call_next(request)
        logger.debug(f"13. Response status: {response.status_code}")
        return response
        
    except Exception as e:
        logger.error(f"14. Unexpected error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )

@app.get("/")
async def root():
    return {"message": "Cavista Backend Service"}

@app.post("/api/v1/integrations/auth")
async def handle_auth(request: Request):
    logger.debug("1. Starting auth handler")
    try:
        body = await request.json()
        logger.debug(f"2. Received auth request body: {body}")
        
        code = body.get('code')
        redirect_uri = body.get('redirect_uri')
        
        if not code:
            logger.error("3. No auth code provided")
            return JSONResponse(
                status_code=400,
                content={"error": "No authorization code provided"}
            )
            
        logger.debug(f"4. Auth code received: {code[:10]}...")
        logger.debug(f"5. Redirect URI: {redirect_uri}")
        
        try:
            # Add your Google OAuth token exchange logic here
            # This is where you'd exchange the code for tokens
            logger.debug("6. Attempting to exchange code for tokens")
            
            # Mock success response for now
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": "Authorization successful"
                }
            )
            
        except Exception as e:
            logger.error(f"7. Error exchanging code: {str(e)}")
            return JSONResponse(
                status_code=401,
                content={"error": f"Failed to exchange code: {str(e)}"}
            )
            
    except Exception as e:
        logger.error(f"8. Unexpected error in auth handler: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)