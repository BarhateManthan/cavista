

import google.generativeai as genai

def query_gemini(text):
    """
    Query the Gemini API with the given text.
    """
    genai.configure(api_key="AIzaSyAihO7eGZVGEOSimZOiBKKTdB0WUuA2lKk")
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content(f"Summarize the following: {text}")
    return response.text
