from fastapi import FastAPI, File, UploadFile
import os
from pdf2image import convert_from_path
import pytesseract
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

app = FastAPI()

UPLOAD_FOLDER = "uploads"
OUTPUT_FILE = "output.txt"
VECTOR_DB_FILE = "vector_db.index"
ALLOWED_EXTENSIONS = {"pdf"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load BioBERT Model for NER
model_name = "dmis-lab/biobert-v1.1"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(model_name)
nlp_pipeline = pipeline("ner", model=model, tokenizer=tokenizer)

# Load Sentence Transformer for Embeddings
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# Initialize FAISS Index
D = 384  # Embedding dimension for MiniLM
if os.path.exists(VECTOR_DB_FILE):
    index = faiss.read_index(VECTOR_DB_FILE)
else:
    index = faiss.IndexFlatL2(D)

# Function to check allowed file type
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# Convert PDF to Text
def extract_text_from_pdf(pdf_path):
    pages = convert_from_path(pdf_path)
    text = ""
    for page in pages:
        text += pytesseract.image_to_string(page, lang="eng") + "\n"

    print("\n========== Extracted Text ==========")
    print(text)
    return text.strip()

# Extract Medical Terms using BioBERT
def extract_medical_terms(text):
    ner_results = nlp_pipeline(text)
    medical_terms = set()

    for entity in ner_results:
        if entity["score"] > 0.85:
            medical_terms.add(entity["word"])

    if not medical_terms:
        print("⚠️ No medical terms extracted from text.")
    
    return list(medical_terms)

# Append Extracted Data to output.txt
def save_output(text, medical_terms):
    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:  # 'a' mode appends data
        f.write("\n========== Extracted Text ==========\n")
        f.write(text + "\n\n")
        f.write("========== Extracted Medical Terms ==========\n")
        f.write(", ".join(medical_terms) + "\n")

    print(f"\n✅ Output appended to {OUTPUT_FILE}")

# Store Medical Terms in FAISS Vector DB
def store_in_vector_db(medical_terms):
    global index

    if not medical_terms:
        print("⚠️ No new medical terms to store in vector DB.")
        return

    embeddings = embed_model.encode(medical_terms, convert_to_numpy=True)
    index.add(embeddings)
    faiss.write_index(index, VECTOR_DB_FILE)

    print(f"\n✅ Vector DB updated and stored at {VECTOR_DB_FILE}")

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    if not allowed_file(file.filename):
        return {"error": "Only PDF files are allowed"}

    # Save file temporarily
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    # Process the file
    extracted_text = extract_text_from_pdf(file_path)
    if not extracted_text.strip():
        return {"error": "No text extracted from the PDF."}

    medical_terms = extract_medical_terms(extracted_text)

    # Save and store results
    save_output(extracted_text, medical_terms)
    store_in_vector_db(medical_terms)

    return {
        "message": f"Processed {file.filename}",
        "extracted_terms": medical_terms,
        "vector_db_path": os.path.abspath(VECTOR_DB_FILE)  # Full path to vector DB
    }
