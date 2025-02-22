import os
import fitz  
from PIL import Image
import pytesseract
import io

def pdf_to_text(pdf_path, output_folder):
    text = ""
    doc = fitz.open(pdf_path)
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        page_text = page.get_text()
        
        if len(page_text.strip()) < 100:  # OCR 
            pix = page.get_pixmap()
            img = Image.open(io.BytesIO(pix.tobytes()))
            page_text = pytesseract.image_to_string(img)
            
        text += page_text + "\n"
    
    # Save 
    base_name = os.path.basename(pdf_path).replace(".pdf", ".txt")
    output_path = os.path.join(output_folder, base_name)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    
    return output_path

def process_uploads(uploads_folder, text_folder):
    if not os.path.exists(text_folder):
        os.makedirs(text_folder)
    
    processed_files = []
    for filename in os.listdir(uploads_folder):
        if filename.lower().endswith(".pdf"):
            pdf_path = os.path.join(uploads_folder, filename)
            try:
                output_path = pdf_to_text(pdf_path, text_folder)
                processed_files.append(output_path)
            except Exception as e:
                print(f"Error processing {filename}: {str(e)}")
    
    return processed_files