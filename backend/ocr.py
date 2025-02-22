import os
import pytesseract
from pdf2image import convert_from_path

def pdf_to_text(pdf_path, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    pages = convert_from_path(pdf_path)
    text = ""
    for i, page in enumerate(pages):
        text += pytesseract.image_to_string(page)
    
    pdf_name = os.path.basename(pdf_path).replace('.pdf', '.txt')
    output_path = os.path.join(output_folder, pdf_name)
    
    with open(output_path, 'w') as f:
        f.write(text)
    
    return output_path

def process_pdfs(uploads_folder, text_folder):
    for pdf_file in os.listdir(uploads_folder):
        if pdf_file.endswith('.pdf'):
            pdf_path = os.path.join(uploads_folder, pdf_file)
            pdf_to_text(pdf_path, text_folder)

if __name__ == "__main__":
    uploads_folder = os.path.join(os.getcwd(), 'uploads')
    text_folder = os.path.join(os.getcwd(), 'text')
    process_pdfs(uploads_folder, text_folder)