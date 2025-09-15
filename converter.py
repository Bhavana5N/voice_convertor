import os
import zipfile
import warnings
from pydub import AudioSegment
import whisper
import librosa
import soundfile as sf
import numpy as np
import docx
import PyPDF2
from datetime import datetime

# Suppress pydub warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydub")

def reduce_noise(audio_path, output_path):
    try:
        y, sr = librosa.load(audio_path, sr=None)
        y_reduced = librosa.effects.preemphasis(y)
        sf.write(output_path, y_reduced, sr)
        return output_path
    except Exception as e:
        return audio_path

def convert_m4a_to_wav(audio_path, wav_path):
    try:
        audio = AudioSegment.from_file(audio_path, format=audio_path.split(".")[-1])
        audio.export(wav_path, format="wav")
        return wav_path
    except Exception as e:
        raise Exception(f"Failed to convert audio to wav: {e}")

def transcribe_with_whisper(wav_path):
    try:
        model = whisper.load_model("base")
        result = model.transcribe(wav_path, fp16=False)
        return result["text"]
    except Exception as e:
        raise Exception(f"Whisper transcription failed: {e}")

def transcribe_audio(audio_path, output_text_file):
    wav_path = audio_path.rsplit(".", 1)[0] + "_temp.wav"
    processed_wav_path = audio_path.rsplit(".", 1)[0] + "_processed.wav"
    try:
        convert_m4a_to_wav(audio_path, wav_path)
        reduce_noise(wav_path, processed_wav_path)
        text = transcribe_with_whisper(processed_wav_path if os.path.exists(processed_wav_path) else wav_path)
        write_to_text_file(text, output_text_file)
        return text
    except Exception as e:
        return f"Error transcribing {audio_path}: {e}"
    finally:
        for path in [wav_path, processed_wav_path]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except:
                    pass

def write_to_text_file(text, output_file):
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"[{timestamp}] {text}\n")
    except Exception as e:
        pass

def extract_text_from_docx(docx_path):
    try:
        doc = docx.Document(docx_path)
        text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        return text
    except Exception as e:
        return f"Error extracting text from {docx_path}: {e}"

def extract_text_from_pdf(pdf_path):
    try:
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
            return text.strip()
    except Exception as e:
        return f"Error extracting text from {pdf_path}: {e}"

def extract_text_from_txt(txt_path):
    try:
        with open(txt_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error reading {txt_path}: {e}"

def process_zip_file(zip_path, output_dir="extracted_texts_output"):
    if not os.path.exists(zip_path):
        return
    os.makedirs(output_dir, exist_ok=True)
    temp_dir = "temp_extracted"
    os.makedirs(temp_dir, exist_ok=True)
    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.testzip()
            zip_ref.extractall(temp_dir)
    except zipfile.BadZipFile as e:
        return
    except Exception as e:
        return
    for root, _, files in os.walk(temp_dir):
        for file in files:
            file_path = os.path.join(root, file)
            file_ext = file.lower().split(".")[-1]
            rel_path = os.path.relpath(file_path, temp_dir).replace(os.sep, "_")
            output_file = os.path.join(output_dir, f"{os.path.splitext(rel_path)[0]}.txt")
            try:
                if file_ext in ["m4a", "mp3", "wav"]:
                    text = transcribe_audio(file_path, output_file)
                elif file_ext == "txt":
                    text = extract_text_from_txt(file_path)
                    write_to_text_file(text, output_file)
                elif file_ext == "docx":
                    text = extract_text_from_docx(file_path)
                    write_to_text_file(text, output_file)
                elif file_ext == "pdf":
                    text = extract_text_from_pdf(file_path)
                    write_to_text_file(text, output_file)
                else:
                    continue
            except Exception as e:
                write_to_text_file(f"Error processing {file}: {e}", output_file)
    try:
        for root, dirs, files in os.walk(temp_dir, topdown=False):
            for file in files:
                os.remove(os.path.join(root, file))
            for dir in dirs:
                os.rmdir(os.path.join(root, dir))
        os.rmdir(temp_dir)
    except Exception as e:
        pass
