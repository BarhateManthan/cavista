from routes.google_drive import router as drive_router

app.include_router(drive_router, prefix="/api/drive", tags=["drive"])
GOOGLE_CLIENT_ID = "553717593899-lo8846a22oaep6glau4mao7bo5n923ar.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "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"
GOOGLE_REDIRECT_URI = 'http://localhost:8080/api/v1/integrations/callback'
DATA_DIR='data'