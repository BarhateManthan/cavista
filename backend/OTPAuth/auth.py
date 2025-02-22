from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import secrets
import redis
import json

app = FastAPI()

# CORS is like "Yo, you cool?" to frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connecting to Redis because we ain't got time for slow shit
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
def generate_otp(request: OTPRequest):
    otp = secrets.token_hex(3)  # 6 characters, cause why not
    redis_client.setex(f"otp:{otp}", 300, request.user_id)  # Expires in 5 mins, better hurry
    
    return {"message": "OTP generated successfully", "otp": otp}

@app.post("/api/verify-otp")
def verify_otp(request: OTPVerify):
    user_id = redis_client.get(f"otp:{request.otp}")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="OTP expired or invalid. Damn, that sucks")

    # Creating a session 'cause docs and patients gotta chat
    session_data = {
        "doctor_id": request.doctor_id,
        "start_time": datetime.now().isoformat()
    }
    redis_client.setex(f"session:{user_id}", 3600, json.dumps(session_data))  # 1-hour session

    return {"message": "OTP verified successfully", "user_id": user_id}

@app.post("/api/save-notes")
def save_notes(note: NoteCreate):
    session_data = redis_client.get(f"session:{note.user_id}")
    
    if not session_data:
        raise HTTPException(status_code=403, detail="No active session found. Where tf you at?")
    
    session = json.loads(session_data)
    if session["doctor_id"] != note.doctor_id:
        raise HTTPException(status_code=403, detail="Unauthorized access. Not today, buddy")

    # Saving notes the old-school way
    filename = f"notes_{note.user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    with open(f"./notes/{filename}", "w") as f:
        f.write(note.content)
    
    return {"message": "Notes saved successfully", "filename": filename}

@app.post("/api/end-session")
def end_session(request: OTPRequest):
    if redis_client.delete(f"session:{request.user_id}"):
        return {"message": "Session ended successfully. Later, nerd"}
    
    raise HTTPException(status_code=400, detail="Invalid user ID or session already ended. Well, that blows")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)  # Running this bad boy on port 8000
