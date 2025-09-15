# Audio/Text Converter

A web-based tool for converting audio files (m4a, mp3, wav) and documents (txt, docx, pdf, zip) to text. The frontend is hosted on GitHub Pages, and the backend is powered by Python (Flask).

## Features
- Convert audio files to text using OpenAI Whisper
- Extract text from TXT, DOCX, PDF, and ZIP files
- Simple web interface for file upload
- API backend for dynamic processing

## How It Works
1. **Frontend:**
   - Hosted on GitHub Pages (`index.html`, `style.css`, `app.js`)
   - Allows users to upload files and sends them to the backend API
2. **Backend:**
   - Python Flask API (`api.py`)
   - Uses `converter.py` for file processing
   - Must be deployed on a cloud platform (Render, Heroku, AWS, etc.)

## Setup Instructions

### 1. Backend (Python)
- Clone the repository
- Install dependencies:
  ```bash
  pip install -r requirements.txt
  ```
- Run the Flask API:
  ```bash
  python api.py
  ```
- Deploy to a cloud platform for public access

### 2. Frontend (GitHub Pages)
- Edit `app.js` and set `API_URL` to your backend's public endpoint
- Push your code to GitHub and enable Pages in repository settings

## API Usage
- Endpoint: `/api/upload`
- Method: `POST`
- Form field: `file` (audio, text, docx, pdf, or zip)
- Returns: JSON with `result` (transcribed/extracted text)

## Supported Formats
- Audio: m4a, mp3, wav
- Documents: txt, docx, pdf
- Archives: zip (containing supported files)

## Usage Options

### 1. GitHub Pages (JavaScript Only)
- TXT, PDF, DOCX files are processed directly in the browser using JavaScript.
- No backend required for these formats.
- For audio/zip/advanced processing, use the Python backend (see below).
- Required JS libraries:
  - [pdf.js](https://mozilla.github.io/pdf.js/)
  - [mammoth.js](https://github.com/mwilliamson/mammoth.js)

### 2. Python Backend (Optional)
- For audio files (m4a, mp3, wav) and ZIP archives, use the Python backend (`api.py`).
- Deploy backend on Render, Heroku, etc.
- Update `API_URL` in `app.js` to your backend endpoint.

## Configuration
- To use only browser-based extraction, no setup is needed—just open the site on GitHub Pages.
- To enable server-side processing, deploy the backend and set the API URL in `app.js`.

## Example
- TXT, PDF, DOCX: Instant extraction in browser.
- Audio/ZIP: Sent to backend for processing if configured.

## Credits
- Uses [OpenAI Whisper](https://github.com/openai/whisper) for transcription
- Built with Flask, Pydub, Librosa, PyPDF2, python-docx

## License
MIT