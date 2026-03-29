import requests
import os

url = "http://localhost:5001/analyze-statement"
pdf_path = "sample_statement.pdf"

if not os.path.exists(pdf_path):
    print(f"File {pdf_path} not found.")
    exit(1)

with open(pdf_path, 'rb') as f:
    files = {'file': (pdf_path, f, 'application/pdf')}
    try:
        r = requests.post(url, files=files, timeout=30)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")
