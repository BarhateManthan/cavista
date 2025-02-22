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
    otp = secrets.token_hex(3) # 2 * 3 = 6
    redis_client.setex(f"otp:{otp}", 30, request.user_id)  # 30s expiry
    
    return {"message": "OTP generated", "otp": otp}  

@app.post("/verify-otp")
def verify_otp(request: OTPVerify):
    user_id = redis_client.get(f"otp:{request.otp}")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="OTP expired or invalid")

    # kick that guy out after 1 hour
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
    # find that thinggg
    otp_keys = redis_client.keys("otp:*")  # get all otpsss
    for otp_key in otp_keys:
        if redis_client.get(otp_key) == request.user_id:
            redis_client.delete(otp_key)  # throw that bish

    # deleteeeee
    if redis_client.delete(f"session:{request.user_id}"):
        return {"message": "Session ended. Doctor access revoked."}

    raise HTTPException(status_code=400, detail="Invalid user ID or session already ended")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
