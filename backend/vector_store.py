import os
import faiss
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings

def create_vector_store(text_folder, rag_folder):
    if not os.path.exists(rag_folder):
        os.makedirs(rag_folder)
    documents = []
    for filename in os.listdir(text_folder):
        if filename.endswith(".txt"):
            file_path = os.path.join(text_folder, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
            documents.append(text)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    splits = text_splitter.create_documents(documents)
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    #  FAISSsssssssssssssssssssssssssssssss index
    vector_store = FAISS.from_documents(splits, embeddings)
    vector_store.save_local(rag_folder)
    
    return vector_store