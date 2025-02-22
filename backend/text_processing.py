import os

def preprocess_text(text_folder):
    texts = []
    for text_file in os.listdir(text_folder):
        if text_file.endswith('.txt'):
            with open(os.path.join(text_folder, text_file), 'r') as f:
                texts.append(f.read())
    return texts