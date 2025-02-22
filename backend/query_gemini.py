import os
import google.generativeai as genai
from dotenv import load_dotenv
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

load_dotenv()

class GeminiQuery:
    def __init__(self, rag_folder):
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.vector_store = FAISS.load_local(rag_folder, self.embeddings, allow_dangerous_deserialization=True)
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel('gemini-pro')
    
    def query(self, question, k=3):
        docs = self.vector_store.similarity_search(question, k=k)
        context = "\n\n".join([doc.page_content for doc in docs])
        prompt = f"Context:\n{context}\n\nQuestion: {question}\nAnswer:"
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating response: {str(e)}"