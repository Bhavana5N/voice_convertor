import os
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from your_converter_module import process_zip_file, transcribe_audio, extract_text_from_txt, extract_text_from_docx, extract_text_from_pdf

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'zip', 'm4a', 'mp3', 'wav', 'txt', 'docx', 'pdf'}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        ext = filename.rsplit('.', 1)[1].lower()
        output = None
        if ext == 'zip':
            process_zip_file(file_path, output_dir='uploads/output')
            output = 'Processed ZIP. Check output folder.'
        elif ext in ['m4a', 'mp3', 'wav']:
            output = transcribe_audio(file_path, os.path.join('uploads/output', filename + '.txt'))
        elif ext == 'txt':
            output = extract_text_from_txt(file_path)
        elif ext == 'docx':
            output = extract_text_from_docx(file_path)
        elif ext == 'pdf':
            output = extract_text_from_pdf(file_path)
        else:
            output = 'Unsupported file type.'
        return jsonify({'result': output})
    return jsonify({'error': 'File type not allowed'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
