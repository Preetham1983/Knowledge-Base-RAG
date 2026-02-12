import requests
import io
from PyPDF2 import PdfWriter

def create_dummy_pdf():
    pdf_writer = PdfWriter()
    page = pdf_writer.add_blank_page(width=72, height=72)
    pdf_bytes = io.BytesIO()
    pdf_writer.write(pdf_bytes)
    pdf_bytes.seek(0)
    return pdf_bytes

def test_upload():
    url = "http://127.0.0.1:5000/upload-pdf"
    
    # Create a dummy PDF file in memory
    pdf_file = create_dummy_pdf()
    
    files = {'pdf_files': ('test.pdf', pdf_file, 'application/pdf')}
    
    try:
        response = requests.post(url, files=files)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_upload()
