import os
import google.generativeai as genai
from chromadb import Client, Settings
from backend.ocr import process_pdfs
from backend.vector_db import create_vector_store

# Configure Gemini API
def configure_gemini(api_key):
    genai.configure(api_key=api_key)

# Query the vector store and get a response from Gemini
def query_vector_store(query, rag_folder, api_key):
    # Configure Gemini
    configure_gemini(api_key)
    
    # Load ChromaDB collection
    client = Client(Settings(persist_directory=os.path.join(rag_folder, 'chroma_db')))
    collection = client.get_collection(name="pdf_texts")
    
    # Query the vector store
    results = collection.query(query_texts=[query], n_results=5)
    
    # Combine the top results into a single context string
    context = "\n".join(results['documents'][0])
    
    # Use Gemini to generate a response
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content(f"Context: {context}\n\nQuestion: {query}")
    
    return response.text

def main():
    uploads_folder = os.path.join(os.getcwd(), 'uploads')
    text_folder = os.path.join(os.getcwd(), 'text')
    rag_folder = os.path.join(os.getcwd(), 'rag')
    api_key = "AIzaSyAihO7eGZVGEOSimZOiBKKTdB0WUuA2lKk"  # Replace with your Gemini API key
    
    # Step 1: Process PDFs and save text files
    process_pdfs(uploads_folder, text_folder)
    
    # Step 2: Create vector store
    create_vector_store(text_folder, rag_folder)
    
    # Step 3: Query the vector store
    query = "tell me the summary."
    response = query_vector_store(query, rag_folder, api_key)
    print(response)

if __name__ == "__main__":
    main()