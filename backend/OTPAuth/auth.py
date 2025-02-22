from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import secrets
import redis

app = FastAPI()

# Connect to Redis
redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

class OTPRequest(BaseModel):
    user_id: str

class OTPVerify(BaseModel):
    doctor_id: str
    otp: str

@app.post("/generate-otp")
def generate_otp(request: OTPRequest):
    otp = secrets.token_hex(3)  # Secure 6-char OTP
    redis_client.setex(f"otp:{otp}", 30, request.user_id)  # Store OTP mapped to user_id with 30-sec expiry
    
    return {"message": "OTP generated", "otp": otp}  # Send via SMS/Email in production

@app.post("/verify-otp")
def verify_otp(request: OTPVerify):
    user_id = redis_client.get(f"otp:{request.otp}")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="OTP expired or invalid")

    # Create session with 5-minute expiry, linking doctor to user
    redis_client.setex(f"session:{user_id}", 3600, request.doctor_id)

    return {"message": "OTP verified. Doctor has access.", "user_id": user_id}

@app.get("/get-user-data/{user_id}")
def get_user_data(user_id: str):
    doctor_id = redis_client.get(f"session:{user_id}")
    
    if not doctor_id:
        raise HTTPException(status_code=403, detail="Access denied. No valid session.")
    
    return {"message": f"Doctor {doctor_id} can access user {user_id}'s data."}

@app.post("/end-session")
def end_session(request: OTPRequest):
    if redis_client.delete(f"session:{request.user_id}"):
        return {"message": "Session ended. Doctor access revoked."}
    
    raise HTTPException(status_code=400, detail="Invalid user ID or session already ended")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
