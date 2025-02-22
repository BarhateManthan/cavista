import os
from pdf2image import convert_from_path
import pytesseract
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

# Define directories
UPLOAD_FOLDER = "./uploads"
TEXT_FOLDER = "./text"
RAG_FOLDER = "./rag"
VECTOR_DB_FILE = os.path.join(RAG_FOLDER, "vector_db.index")
ALLOWED_EXTENSIONS = {"pdf"}

# Ensure required directories exist
os.makedirs(TEXT_FOLDER, exist_ok=True)
os.makedirs(RAG_FOLDER, exist_ok=True)

# Load BioBERT for NER
model_name = "dmis-lab/biobert-v1.1"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(model_name)
nlp_pipeline = pipeline("ner", model=model, tokenizer=tokenizer)

# Load Sentence Transformer for embeddings
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# Initialize FAISS index
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
    
    return text.strip()

# Extract Medical Terms using BioBERT
def extract_medical_terms(text):
    ner_results = nlp_pipeline(text)
    medical_terms = set()

    for entity in ner_results:
        if entity["score"] > 0.85:
            medical_terms.add(entity["word"])
    
    return list(medical_terms)

# Save extracted text
def save_text(text, filename):
    text_path = os.path.join(TEXT_FOLDER, f"{filename}.txt")
    with open(text_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"✅ Extracted text saved to {text_path}")

# Store medical terms in FAISS Vector DB
def store_in_vector_db(medical_terms):
    global index
    if not medical_terms:
        print("⚠️ No medical terms to store in vector DB.")
        return
    
    embeddings = embed_model.encode(medical_terms, convert_to_numpy=True)
    index.add(embeddings)
    faiss.write_index(index, VECTOR_DB_FILE)
    print(f"✅ Vector DB updated and saved at {VECTOR_DB_FILE}")

# Process all PDFs in the uploads folder
def process_pdfs():
    pdf_files = [f for f in os.listdir(UPLOAD_FOLDER) if allowed_file(f)]
    
    if not pdf_files:
        print("⚠️ No PDF files found in the uploads folder.")
        return

    for pdf_file in pdf_files:
        pdf_path = os.path.join(UPLOAD_FOLDER, pdf_file)
        print(f"📄 Processing {pdf_file}...")

        extracted_text = extract_text_from_pdf(pdf_path)
        if not extracted_text:
            print(f"⚠️ No text extracted from {pdf_file}. Skipping...")
            continue

        medical_terms = extract_medical_terms(extracted_text)

        # Save results
        save_text(extracted_text, os.path.splitext(pdf_file)[0])
        store_in_vector_db(medical_terms)

        print(f"✅ Finished processing {pdf_file}.\n")

if __name__ == "__main__":
    process_pdfs()
