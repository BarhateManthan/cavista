import os
from chromadb import Client, Settings
from backend.text_processing import preprocess_text

def create_vector_store(text_folder, rag_folder):
    texts = preprocess_text(text_folder)
    
    # Ensure the rag folder exists
    if not os.path.exists(rag_folder):
        os.makedirs(rag_folder)
    
    # Initialize ChromaDB client
    client = Client(Settings(persist_directory=os.path.join(rag_folder, 'chroma_db')))
    
    # Create or load a collection
    collection = client.get_or_create_collection(name="pdf_texts")
    
    # Add documents to the collection
    for i, text in enumerate(texts):
        collection.add(documents=[text], ids=[str(i)])
    
    # ChromaDB automatically persists data, so no need to call `persist`

if __name__ == "__main__":
    text_folder = os.path.join(os.getcwd(), 'text')
    rag_folder = os.path.join(os.getcwd(), 'rag')
    create_vector_store(text_folder, rag_folder)