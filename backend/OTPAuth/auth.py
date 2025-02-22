from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import secrets
import redis
from datetime import datetime
import json

app = FastAPI()

# CORS setup so the frontend doesn’t    freak out
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Where the React magic happens
    allow_credentials=True,
    allow_methods=["*"],  # Letting all methods slide
    allow_headers=["*"],  # No gatekeeping on headers
)

# Hooking up to Redis 'cause we ain't got time for slow storage
redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

class OTPRequest(BaseModel):
    user_id: str

class OTPVerify(BaseModel):
    doctor_id: str
    otp: str

class NoteCreate(BaseModel):
    user_id: str
    doctor_id: str
    content: str

@app.post("/api/generate-otp")
async def generate_otp(request: OTPRequest):
    try:
        otp = secrets.token_hex(3)  # 6-char OTP
        otp_key = f"otp:{otp}"
        redis_client.setex(otp_key, 30, request.user_id)  # OTP expires in 30 seconds
        return {"message": "OTP generated, don't waste time", "otp": otp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verify-otp")
async def verify_otp(request: OTPVerify):
    try:
        user_id = redis_client.get(f"otp:{request.otp}")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="OTP’s either dead or fake")

        # Store session data with the OTP key for easy invalidation
        session_data = {
            "doctor_id": request.doctor_id,
            "start_time": datetime.now().isoformat(),
            "otp_key": f"otp:{request.otp}"  # Store the OTP key in session data
        }
        redis_client.setex(f"session:{user_id}", 3600, json.dumps(session_data))  # Session expires in 1 hour

        return {"message": "OTP verified, you’re in", "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/end-session")
async def end_session(request: OTPRequest):
    try:
        session_key = f"session:{request.user_id}"
        session_data = redis_client.get(session_key)
        
        if not session_data:
            raise HTTPException(status_code=400, detail="No session to end, move along")
        
        # Parse session data to get the OTP key
        session = json.loads(session_data)
        otp_key = session.get("otp_key")
        
        # Delete the session
        redis_client.delete(session_key)
        
        # Delete the OTP if it exists
        if otp_key:
            redis_client.delete(otp_key)
        
        return {"message": "Session ended, see ya"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/save-notes")
async def save_notes(note: NoteCreate):
    try:
        session_data = redis_client.get(f"session:{note.user_id}")
        
        if not session_data:
            raise HTTPException(status_code=403, detail="No session found, try harder")
        
        session = json.loads(session_data)
        if session["doctor_id"] != note.doctor_id:
            raise HTTPException(status_code=403, detail="Not your session, buddy")

        # Saving notes, old-school style
        filename = f"notes_{note.user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(f"./notes/{filename}", "w") as f:
            f.write(note.content)
        
        return {"message": "Notes saved, don’t lose ‘em", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
