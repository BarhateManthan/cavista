from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
from typing import Optional
from backend.ocr_processing import process_uploads, pdf_to_text
from backend.vector_store import create_vector_store
from backend.query_gemini import GeminiQuery
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document

app = FastAPI()

# Configuration
CONFIG = {
    'UPLOAD_FOLDER': './uploads',
    'TEXT_FOLDER': './text',
    'RAG_FOLDER': './rag',
    'ALLOWED_EXTENSIONS': {'pdf', 'txt'}
}

# Ensure directories exist
for folder in [CONFIG['UPLOAD_FOLDER'], 
               CONFIG['TEXT_FOLDER'], 
               CONFIG['RAG_FOLDER']]:
    os.makedirs(folder, exist_ok=True)

# Pydantic models for request/response
class ChatRequest(BaseModel):
    prompt: str

class ChatResponse(BaseModel):
    status: str
    response: str

class StandardResponse(BaseModel):
    status: str
    message: str
    file_path: Optional[str] = None
    vector_store_path: Optional[str] = None

def allowed_file(filename: str) -> bool:
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in CONFIG['ALLOWED_EXTENSIONS']

@app.post("/kb", response_model=StandardResponse)
async def handle_kb():
    try:
        # Process all PDFs in uploads folder
        processed = process_uploads(CONFIG['UPLOAD_FOLDER'], CONFIG['TEXT_FOLDER'])
        
        # Create new vector store
        create_vector_store(CONFIG['TEXT_FOLDER'], CONFIG['RAG_FOLDER'])
        
        return StandardResponse(
            status="success",
            message="Knowledge base created",
            vector_store_path=CONFIG['RAG_FOLDER']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/kb_add_file", response_model=StandardResponse)
async def handle_add_file(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
        
    if not file.filename:
        raise HTTPException(status_code=400, detail="Empty filename")
        
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Invalid file type")

    filename = file.filename  # FastAPI's UploadFile already handles secure filenames
    text_content = ""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    try:
        # Handle PDF files
        if filename.lower().endswith('.pdf'):
            pdf_path = os.path.join(CONFIG['UPLOAD_FOLDER'], filename)
            with open(pdf_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            text_path = pdf_to_text(pdf_path, CONFIG['TEXT_FOLDER'])
            with open(text_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
                
        # Handle text files
        else:
            text_path = os.path.join(CONFIG['TEXT_FOLDER'], filename)
            content = await file.read()
            with open(text_path, "wb") as buffer:
                buffer.write(content)
            with open(text_path, 'r', encoding='utf-8') as f:
                text_content = f.read()

        # Split the new content
        splits = text_splitter.create_documents([text_content])
        
        # Load existing vector store
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vector_store = FAISS.load_local(
            CONFIG['RAG_FOLDER'], 
            embeddings, 
            allow_dangerous_deserialization=True
        )
        
        # Add new documents and save
        vector_store.add_documents(splits)
        vector_store.save_local(CONFIG['RAG_FOLDER'])
        
        return StandardResponse(
            status="success",
            message="File added to knowledge base",
            file_path=text_path
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def handle_chat(request: ChatRequest):
    try:
        qa = GeminiQuery(CONFIG['RAG_FOLDER'])
        response = qa.query(request.prompt)
        return ChatResponse(
            status="success",
            response=response
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)