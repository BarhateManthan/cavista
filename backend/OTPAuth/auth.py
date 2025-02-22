from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import secrets
import time

app = FastAPI()

# Temporary storage for OTPs (use Redis/DB in production)
otp_storage = {}

class OTPRequest(BaseModel):
    user_id: str

class OTPVerify(BaseModel):
    user_id: str
    otp: str

@app.post("/generate-otp")
def generate_otp(request: OTPRequest):
    otp = secrets.token_hex(3)  # Secure 6-character hex OTP
    otp_storage[request.user_id] = {
        "otp": otp,
        "timestamp": time.time()
    }
    return {"message": "OTP generated", "otp": otp}  # Send via SMS/Email in production

@app.post("/verify-otp")
def verify_otp(request: OTPVerify):
    user_data = otp_storage.get(request.user_id)
    if not user_data:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if time.time() - user_data["timestamp"] > 30:  # OTP expires in 5 minutes
        raise HTTPException(status_code=400, detail="OTP expired")
    
    if user_data["otp"] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    return {"message": "OTP verified. Doctor can access user data."}

@app.post("/end-session")
def end_session(request: OTPRequest):
    if request.user_id in otp_storage:
        del otp_storage[request.user_id]
        return {"message": "Session ended. OTP invalidated."}
    raise HTTPException(status_code=400, detail="Invalid user ID or session already ended")

# Run the FastAPI server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)