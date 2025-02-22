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
        otp = secrets.token_hex(3)  # 6-char OTP, keep it short and sweet
        redis_client.setex(f"otp:{otp}", 300, request.user_id)  # 5 mins and poof, it's gone
        return {"message": "OTP generated, don't waste time", "otp": otp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verify-otp")
async def verify_otp(request: OTPVerify):
    try:
        user_id = redis_client.get(f"otp:{request.otp}")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="OTP’s either dead or fake")

        session_data = {
            "doctor_id": request.doctor_id,
            "start_time": datetime.now().isoformat()
        }
        redis_client.setex(f"session:{user_id}", 3600, json.dumps(session_data))  # 1-hour pass

        return {"message": "OTP verified, you’re in", "user_id": user_id}
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

@app.post("/api/end-session")
async def end_session(request: OTPRequest):
    try:
        if redis_client.delete(f"session:{request.user_id}"):
            return {"message": "Session ended, see ya"}
        
        raise HTTPException(status_code=400, detail="No session to end, move along")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
