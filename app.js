/**
 * Audio Transcription Hub - Main Application
 * Based on the Python transcription script functionality
 */

class AudioTranscriptionHub {
    constructor() {
        this.uploadedFiles = [];
        this.processedFiles = new Map();
        this.recognition = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isPaused = false;
        this.currentStream = null;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        
        // Settings
        this.settings = {
            autoSave: true,
            timestampFormat: 'none',
            confidenceThreshold: 0.8,
            language: 'en-US'
        };
        
        this.initializeElements();
        this.initializeSpeechRecognition();
        this.initializeAudioVisualization();
        this.bindEvents();
        this.loadSettings();
        
        console.log('Audio Transcription Hub initialized successfully');
    }
    
    // Initialize DOM elements
    initializeElements() {
        // File upload elements
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.processBtn = document.getElementById('processBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        
        // Voice recorder elements
        this.micButton = document.getElementById('micButton');
        this.recorderStatus = document.getElementById('recorderStatus');
        this.languageSelect = document.getElementById('languageSelect');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resumeBtn = document.getElementById('resumeBtn');
        this.stopBtn = document.getElementById('stopBtn');
        
        // Results elements
        this.transcriptArea = document.getElementById('transcriptArea');
        this.transcriptStats = document.getElementById('transcriptStats');
        this.errorMessage = document.getElementById('errorMessage');
        this.successMessage = document.getElementById('successMessage');
        
        // Action buttons
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.speakBtn = document.getElementById('speakBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        // Settings elements
        this.autoSave = document.getElementById('autoSave');
        this.timestampFormat = document.getElementById('timestampFormat');
        this.confidenceThreshold = document.getElementById('confidenceThreshold');
        this.confidenceValue = document.getElementById('confidenceValue');
        
        // Other elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.visualizer = document.getElementById('visualizer');
    }
    
    // Initialize Speech Recognition API
    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showError('Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.');
            this.micButton.disabled = true;
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition settings
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = this.languageSelect.value;
        
        // Set up event handlers
        this.recognition.onstart = () => {
            this.isRecording = true;
            this.updateRecorderUI();
            this.startVisualization();
            console.log('Speech recognition started');
        };
        
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;
                const confidence = result[0].confidence;
                
                // Only include results above confidence threshold
                if (confidence && confidence < this.settings.confidenceThreshold) {
                    continue;
                }
                
                if (result.isFinal) {
                    finalTranscript += this.formatTranscript(transcript) + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update transcript area
            const currentText = this.transcriptArea.value;
            let newText = currentText;
            
            if (finalTranscript) {
                newText = currentText + finalTranscript;
                this.transcriptArea.value = newText;
                
                // Auto-save if enabled
                if (this.settings.autoSave) {
                    this.saveToLocalStorage(newText);
                }
            }
            
            // Show interim results
            const displayText = newText + interimTranscript;
            this.transcriptArea.value = displayText;
            this.updateTranscriptStats(displayText);
            this.transcriptArea.scrollTop = this.transcriptArea.scrollHeight;
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.handleRecognitionError(event.error);
        };
        
        this.recognition.onend = () => {
            this.isRecording = false;
            this.updateRecorderUI();
            this.stopVisualization();
            console.log('Speech recognition ended');
            
            // Restart if not manually stopped
            if (!this.isPaused && this.micButton.classList.contains('recording')) {
                setTimeout(() => {
                    if (!this.isPaused) {
                        this.startRecognition();
                    }
                }, 100);
            }
        };
    }
    
    // Initialize audio visualization
    initializeAudioVisualization() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            
            this.canvas = this.visualizer;
            this.canvasCtx = this.canvas.getContext('2d');
        } catch (error) {
            console.warn('Audio visualization not supported:', error);
        }
    }
    
    // Bind all event listeners
    bindEvents() {
        // File upload events
        this.bindFileUploadEvents();
        
        // Voice recorder events
        this.bindVoiceRecorderEvents();
        
        // Action button events
        this.bindActionButtonEvents();
        
        // Settings events
        this.bindSettingsEvents();
        
        // Global events
        this.bindGlobalEvents();
    }
    
    bindFileUploadEvents() {
        // Drag and drop events
        this.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadZone.classList.add('dragover');
        });
        
        this.uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!this.uploadZone.contains(e.relatedTarget)) {
                this.uploadZone.classList.remove('dragover');
            }
        });
        
        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('dragover');
            this.handleFiles(Array.from(e.dataTransfer.files));
        });
        
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
        });
        
        // Process button
        this.processBtn.addEventListener('click', () => {
            this.processFiles();
        });
    }
    
    bindVoiceRecorderEvents() {
        this.micButton.addEventListener('click', () => {
            if (this.isRecording) {
                this.stopRecognition();
            } else {
                this.startRecognition();
            }
        });
        
        this.pauseBtn.addEventListener('click', () => {
            this.pauseRecognition();
        });
        
        this.resumeBtn.addEventListener('click', () => {
            this.resumeRecognition();
        });
        
        this.stopBtn.addEventListener('click', () => {
            this.stopRecognition();
        });
        
        this.languageSelect.addEventListener('change', (e) => {
            this.settings.language = e.target.value;
            if (this.recognition) {
                this.recognition.lang = e.target.value;
            }
            this.saveSettings();
        });
    }
    
    bindActionButtonEvents() {
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadTranscript());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAllFiles());
        this.speakBtn.addEventListener('click', () => this.speakText());
        this.clearBtn.addEventListener('click', () => this.clearAll());
    }
    
    bindSettingsEvents() {
        this.autoSave.addEventListener('change', (e) => {
            this.settings.autoSave = e.target.checked;
            this.saveSettings();
        });
        
        this.timestampFormat.addEventListener('change', (e) => {
            this.settings.timestampFormat = e.target.value;
            this.saveSettings();
        });
        
        this.confidenceThreshold.addEventListener('input', (e) => {
            this.settings.confidenceThreshold = parseFloat(e.target.value);
            this.confidenceValue.textContent = e.target.value;
            this.saveSettings();
        });
        
        this.transcriptArea.addEventListener('input', () => {
            this.updateTranscriptStats(this.transcriptArea.value);
            if (this.settings.autoSave) {
                this.saveToLocalStorage(this.transcriptArea.value);
            }
        });
    }
    
    bindGlobalEvents() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.downloadTranscript();
                        break;
                    case 'c':
                        if (e.target === this.transcriptArea && this.transcriptArea.selectionStart === this.transcriptArea.selectionEnd) {
                            e.preventDefault();
                            this.copyToClipboard();
                        }
                        break;
                    case 'r':
                        e.preventDefault();
                        if (this.isRecording) {
                            this.stopRecognition();
                        } else {
                            this.startRecognition();
                        }
                        break;
                }
            }
            
            // Space bar for recording toggle (when not typing)
            if (e.code === 'Space' && e.target !== this.transcriptArea) {
                e.preventDefault();
                if (this.isRecording) {
                    this.stopRecognition();
                } else {
                    this.startRecognition();
                }
            }
        });
        
        // Window before unload
        window.addEventListener('beforeunload', (e) => {
            if (this.transcriptArea.value.trim() && !this.settings.autoSave) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }
    
    // Handle file uploads
    handleFiles(files) {
        const validFiles = files.filter(file => this.isValidFile(file));
        const invalidFiles = files.filter(file => !this.isValidFile(file));
        
        if (invalidFiles.length > 0) {
            this.showError(`Unsupported file types: ${invalidFiles.map(f => f.name).join(', ')}`);
        }
        
        if (validFiles.length === 0) return;
        
        validFiles.forEach(file => {
            const fileData = {
                id: this.generateId(),
                file: file,
                name: file.name,
                size: this.formatFileSize(file.size),
                type: file.type || this.getFileType(file.name),
                status: 'pending',
                result: null,
                timestamp: new Date()
            };
            
            this.uploadedFiles.push(fileData);
        });
        
        this.updateFileList();
        this.processBtn.disabled = false;
        this.showSuccess(`Added ${validFiles.length} file(s) to processing queue.`);
    }
    
    // Validate file types
    isValidFile(file) {
        const supportedTypes = [
            'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm',
            'text/plain', 'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip', 'application/x-zip-compressed'
        ];
        
        const supportedExtensions = [
            '.mp3', '.wav', '.m4a', '.mp4', '.webm', '.ogg',
            '.txt', '.pdf', '.docx', '.zip'
        ];
        
        const fileName = file.name.toLowerCase();
        return supportedTypes.includes(file.type) || 
               supportedExtensions.some(ext => fileName.endsWith(ext));
    }
    
    // Get file type from extension
    getFileType(fileName) {
        const ext = fileName.toLowerCase().split('.').pop();
        const typeMap = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'm4a': 'audio/x-m4a',
            'mp4': 'audio/mp4',
            'webm': 'audio/webm',
            'ogg': 'audio/ogg',
            'txt': 'text/plain',
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'zip': 'application/zip'
        };
        return typeMap[ext] || 'application/octet-stream';
    }
    
    // Update file list display
    updateFileList() {
        this.fileList.innerHTML = '';
        
        this.uploadedFiles.forEach((fileData) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item fade-in';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${fileData.name}</div>
                    <div class="file-details">${fileData.size} • ${this.getFileTypeDisplay(fileData.type)}</div>
                </div>
                <div class="file-actions">
                    <span class="file-status status-${fileData.status}">${this.getStatusDisplay(fileData.status)}</span>
                    <button class="remove-file-btn" onclick="app.removeFile('${fileData.id}')" title="Remove file">×</button>
                </div>
            `;
            this.fileList.appendChild(fileItem);
        });
        
        // Update process button text
        const fileCount = this.uploadedFiles.length;
        this.processBtn.textContent = fileCount > 0 ? `🚀 Process ${fileCount} File${fileCount > 1 ? 's' : ''}` : '🚀 Process Files';
    }
    
    // Process uploaded files
    async processFiles() {
        if (this.uploadedFiles.length === 0) return;
        
        this.showLoading(true);
        this.processBtn.disabled = true;
        this.progressBar.style.display = 'block';
        this.clearMessages();
        
        const results = [];
        const totalFiles = this.uploadedFiles.length;
        
        for (let i = 0; i < totalFiles; i++) {
            const fileData = this.uploadedFiles[i];
            fileData.status = 'processing';
            this.updateFileList();
            
            const progress = ((i + 1) / totalFiles) * 100;
            this.updateProgress(progress);
            
            try {
                const result = await this.processFile(fileData.file);
                fileData.status = 'completed';
                fileData.result = result;
                this.processedFiles.set(fileData.id, {
                    name: fileData.name,
                    content: result,
                    timestamp: new Date()
                });
                
                results.push(this.formatFileResult(fileData.name, result));
            } catch (error) {
                console.error(`Error processing ${fileData.name}:`, error);
                fileData.status = 'error';
                fileData.result = `Error: ${error.message}`;
                results.push(this.formatFileResult(fileData.name, `Error: ${error.message}`, true));
            }
            
            this.updateFileList();
            
            // Add small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Update transcript area
        const combinedResult = results.join('\n\n');
        this.transcriptArea.value = combinedResult;
        this.updateTranscriptStats(combinedResult);
        
        // Auto-save if enabled
        if (this.settings.autoSave) {
            this.saveToLocalStorage(combinedResult);
        }
        
        this.showLoading(false);
        this.progressBar.style.display = 'none';
        this.processBtn.disabled = false;
        this.showSuccess(`Successfully processed ${totalFiles} file(s)!`);
        
        console.log(`Processed ${totalFiles} files successfully`);
    }
    
    // Process individual file based on type
    async processFile(file) {
        const fileType = file.type || this.getFileType(file.name);
        
        if (fileType.startsWith('audio/')) {
            return await this.processAudioFile(file);
        } else if (fileType === 'text/plain') {
            return await this.processTextFile(file);
        } else if (fileType === 'application/pdf') {
            return await this.processPDFFile(file);
        } else if (fileType.includes('wordprocessingml')) {
            return await this.processDocxFile(file);
        } else if (fileType.includes('zip')) {
            return await this.processZipFile(file);
        } else {
            throw new Error('Unsupported file type');
        }
    }
    
    // Process audio files (simulation - requires server-side implementation)
    async processAudioFile(file) {
        return new Promise((resolve) => {
            // Simulate processing time
            setTimeout(() => {
                const timestamp = this.formatTimestamp(new Date());
                resolve(`${timestamp}Audio file processed: ${file.name}

[Note: This is a simulated transcription. For actual audio transcription, you would need to implement server-side processing using libraries like OpenAI's Whisper, Google Cloud Speech-to-Text, or similar services.]

Simulated transcript content would appear here based on the audio content of "${file.name}".`);
            }, 1000 + Math.random() * 2000);
        });
    }
    
    // Process text files
    async processTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const timestamp = this.formatTimestamp(new Date());
                resolve(`${timestamp}Text file content from: ${file.name}

${content}`);
            };
            reader.onerror = () => {
                reject(new Error('Failed to read text file'));
            };
            reader.readAsText(file, 'UTF-8');
        });
    }
    
    // Process PDF files (requires additional library)
    async processPDFFile(file) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const timestamp = this.formatTimestamp(new Date());
                resolve(`${timestamp}PDF file processed: ${file.name}

[Note: PDF text extraction requires server-side implementation or additional libraries like PDF.js. This is a placeholder for the extracted content.]

Extracted text content from "${file.name}" would appear here.`);
            }, 1500);
        });
    }
    
    // Process DOCX files (requires additional library)
    async processDocxFile(file) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const timestamp = this.formatTimestamp(new Date());
                resolve(`${timestamp}DOCX file processed: ${file.name}

[Note: DOCX processing requires server-side implementation or libraries like mammoth.js. This is a placeholder for the extracted content.]

Document content from "${file.name}" would appear here.`);
            }, 1200);
        });
    }
    
    // Process ZIP files
    async processZipFile(file) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const timestamp = this.formatTimestamp(new Date());
                resolve(`${timestamp}ZIP file processed: ${file.name}

[Note: ZIP file extraction and processing would require server-side implementation to handle multiple file types within the archive.]

Contents of "${file.name}" would be extracted and processed individually.`);
            }, 2000);
        });
    }
    
    // Voice recognition methods
    async startRecognition() {
        if (!this.recognition) {
            this.showError('Speech recognition not available');
            return;
        }
        
        try {
            // Request microphone permission
            this.currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.clearMessages();
            this.isPaused = false;
            this.recognition.start();
        } catch (error) {
            this.handleRecognitionError(error.name || error.message);
        }
    }
    
    stopRecognition() {
        if (this.recognition && this.isRecording) {
            this.isPaused = true;
            this.recognition.stop();
        }
        
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
    }
    
    pauseRecognition() {
        if (this.isRecording) {
            this.isPaused = true;
            this.recognition.stop();
        }
    }
    
    resumeRecognition() {
        if (this.isPaused) {
            this.isPaused = false;
            this.recognition.start();
        }
    }
    
    // Update recorder UI
    updateRecorderUI() {
        if (this.isRecording) {
            this.micButton.classList.add('recording');
            this.micButton.innerHTML = '⏹️';
            this.recorderStatus.className = 'recorder-status status-recording';
            this.recorderStatus.textContent = '🔴 Recording... Speak now';
            
            this.pauseBtn.disabled = false;
            this.stopBtn.disabled = false;
            this.resumeBtn.disabled = true;
        } else {
            this.micButton.classList.remove('recording');
            this.micButton.innerHTML = '🎤';
            this.recorderStatus.className = 'recorder-status status-idle';
            this.recorderStatus.textContent = this.isPaused ? 
                'Paused. Click resume or microphone to continue.' : 
                'Ready to record. Click the microphone to start.';
                
            this.pauseBtn.disabled = true;
            this.stopBtn.disabled = true;
            this.resumeBtn.disabled = !this.isPaused;
        }
    }
    
    // Handle recognition errors
    handleRecognitionError(error) {
        let message = 'Speech recognition error: ';
        
        switch (error) {
            case 'not-allowed':
            case 'NotAllowedError':
                message += 'Microphone access denied. Please allow microphone access and try again.';
                break;
            case 'no-speech':
                message += 'No speech detected. Please speak more clearly.';
                break;
            case 'network':
                message += 'Network error. Please check your internet connection.';
                break;
            case 'audio-capture':
                message += 'Audio capture failed. Please check your microphone.';
                break;
            case 'aborted':
                return; // Don't show error for manual stops
            default:
                message += error;
        }
        
        this.showError(message);
        this.isRecording = false;
        this.updateRecorderUI();
    }
    
    // Audio visualization methods
    startVisualization() {
        if (!this.audioContext || !this.analyser || !this.currentStream) return;
        
        this.microphone = this.audioContext.createMediaStreamSource(this.currentStream);
        this.microphone.connect(this.analyser);
        
        this.visualizer.style.display = 'block';
        this.drawVisualization();
    }
    
    stopVisualization() {
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        this.visualizer.style.display = 'none';
    }
    
    drawVisualization() {
        if (!this.isRecording) return;
        
        requestAnimationFrame(() => this.drawVisualization());
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const canvas = this.canvas;
        const canvasCtx = this.canvasCtx;
        const width = canvas.width = window.innerWidth;
        const height = canvas.height = 100;
        
        canvasCtx.clearRect(0, 0, width, height);
        
        const barWidth = width / this.bufferLength;
        let x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * height;
            
            const gradient = canvasCtx.createLinearGradient(0, height - barHeight, 0, height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    
    // Action methods
    async copyToClipboard() {
        const text = this.transcriptArea.value;
        if (!text.trim()) {
            this.showError('No text to copy.');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess('Text copied to clipboard!');
        } catch (error) {
            // Fallback for older browsers
            this.transcriptArea.select();
            document.execCommand('copy');
            this.showSuccess('Text copied to clipboard!');
        }
    }
    
    downloadTranscript() {
        const text = this.transcriptArea.value;
        if (!text.trim()) {
            this.showError('No text to download.');
            return;
        }
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `transcript_${timestamp}.txt`;
        
        this.downloadTextFile(text, filename);
        this.showSuccess('Transcript downloaded successfully!');
    }
    
    downloadAllFiles() {
        if (this.processedFiles.size === 0) {
            this.showError('No processed files to download.');
            return;
        }
        
        let combinedContent = `Audio Transcription Hub - Batch Export\nGenerated: ${new Date().toLocaleString()}\n`;
        combinedContent += '='.repeat(60) + '\n\n';
        
        for (let [id, fileData] of this.processedFiles) {
            combinedContent += `File: ${fileData.name}\n`;
            combinedContent += `Processed: ${fileData.timestamp.toLocaleString()}\n`;
            combinedContent += '-'.repeat(40) + '\n';
            combinedContent += fileData.content + '\n\n';
        }
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `all_transcripts_${timestamp}.txt`;
        
        this.downloadTextFile(combinedContent, filename);
        this.showSuccess(`Downloaded ${this.processedFiles.size} processed files!`);
    }
    
    downloadTextFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    speakText() {
        const text = this.transcriptArea.value;
        if (!text.trim()) {
            this.showError('No text to speak.');
            return;
        }
        
        if (!('speechSynthesis' in window)) {
            this.showError('Text-to-speech is not supported in this browser.');
            return;
        }
        
        // Stop any current speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.settings.language;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
            this.speakBtn.textContent = '⏹️ Stop Speaking';
            this.speakBtn.classList.add('speaking');
        };
        
        utterance.onend = () => {
            this.speakBtn.textContent = '🔊 Read Aloud';
            this.speakBtn.classList.remove('speaking');
        };
        
        utterance.onerror = (event) => {
            this.showError(`Speech synthesis error: ${event.error}`);
            this.speakBtn.textContent = '🔊 Read Aloud';
            this.speakBtn.classList.remove('speaking');
        };
        
        if (this.speakBtn.classList.contains('speaking')) {
            speechSynthesis.cancel();
        } else {
            speechSynthesis.speak(utterance);
        }
    }
    
    clearAll() {
        if (this.transcriptArea.value.trim() && 
            !confirm('Are you sure you want to clear all content? This action cannot be undone.')) {
            return;
        }
        
        // Stop any ongoing processes
        this.stopRecognition();
        speechSynthesis.cancel();
        
        // Clear data
        this.transcriptArea.value = '';
        this.uploadedFiles = [];
        this.processedFiles.clear();
        this.fileInput.value = '';
        
        // Reset UI
        this.updateFileList();
        this.updateTranscriptStats('');
        this.processBtn.disabled = true;
        this.progressBar.style.display = 'none';
        this.clearMessages();
        
        // Clear local storage
        localStorage.removeItem('transcriptData');
        
        this.showSuccess('All content cleared successfully.');
    }
    
    // Utility methods
    removeFile(fileId) {
        this.uploadedFiles = this.uploadedFiles.filter(file => file.id !== fileId);
        this.processedFiles.delete(fileId);
        this.updateFileList();
        
        if (this.uploadedFiles.length === 0) {
            this.processBtn.disabled = true;
        }
        
        this.showSuccess('File removed from queue.');
    }
    
    formatTimestamp(date) {
        if (this.settings.timestampFormat === 'none') return '';
        
        if (this.settings.timestampFormat === 'simple') {
            return `[${date.toLocaleTimeString()}] `;
        }
        
        if (this.settings.timestampFormat === 'detailed') {
            return `[${date.toLocaleString()}] `;
        }
        
        return '';
    }
    
    formatTranscript(text) {
        // Clean up the transcript text
        let formatted = text.trim();
        
        // Capitalize first letter of sentences
        formatted = formatted.replace(/(?:^|\.\s+)([a-z])/g, (match, letter) => {
            return match.replace(letter, letter.toUpperCase());
        });
        
        return formatted;
    }
    
    formatFileResult(filename, content, isError = false) {
        const timestamp = this.formatTimestamp(new Date());
        const separator = '='.repeat(Math.max(50, filename.length + 10));
        
        return `${separator}
${timestamp}${isError ? 'ERROR - ' : ''}${filename}
${separator}

${content}`;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    getFileTypeDisplay(mimeType) {
        const typeMap = {
            'audio/mpeg': 'MP3 Audio',
            'audio/wav': 'WAV Audio',
            'audio/x-m4a': 'M4A Audio',
            'audio/mp4': 'MP4 Audio',
            'audio/webm': 'WebM Audio',
            'audio/ogg': 'OGG Audio',
            'text/plain': 'Text File',
            'application/pdf': 'PDF Document',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
            'application/zip': 'ZIP Archive'
        };
        return typeMap[mimeType] || 'Unknown';
    }
    
    getStatusDisplay(status) {
        const statusMap = {
            'pending': 'Pending',
            'processing': 'Processing...',
            'completed': 'Complete',
            'error': 'Error'
        };
        return statusMap[status] || status;
    }
    
    updateProgress(percent) {
        this.progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
    
    updateTranscriptStats(text) {
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const characters = text.length;
        
        if (this.transcriptStats) {
            this.transcriptStats.innerHTML = `
                <span class="word-count">Words: ${words.toLocaleString()}</span>
                <span class="char-count">Characters: ${characters.toLocaleString()}</span>
            `;
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Settings and storage methods
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('transcriptionSettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
            
            // Apply settings to UI
            this.autoSave.checked = this.settings.autoSave;
            this.timestampFormat.value = this.settings.timestampFormat;
            this.confidenceThreshold.value = this.settings.confidenceThreshold;
            this.confidenceValue.textContent = this.settings.confidenceThreshold;
            this.languageSelect.value = this.settings.language;
            
            // Load saved transcript
            const savedTranscript = localStorage.getItem('transcriptData');
            if (savedTranscript && this.settings.autoSave) {
                this.transcriptArea.value = savedTranscript;
                this.updateTranscriptStats(savedTranscript);
            }
            
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('transcriptionSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }
    
    saveToLocalStorage(text) {
        try {
            localStorage.setItem('transcriptData', text);
        } catch (error) {
            console.warn('Failed to save transcript:', error);
        }
    }
    
    // UI feedback methods
    showError(message) {
        this.clearMessages();
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.errorMessage.classList.add('fade-in');
        
        console.error('Error:', message);
        
        setTimeout(() => {
            this.clearMessages();
        }, 5000);
    }
    
    showSuccess(message) {
        this.clearMessages();
        this.successMessage.textContent = message;
        this.successMessage.style.display = 'block';
        this.successMessage.classList.add('fade-in');
        
        console.log('Success:', message);
        
        setTimeout(() => {
            this.clearMessages();
        }, 3000);
    }
    
    clearMessages() {
        this.errorMessage.style.display = 'none';
        this.successMessage.style.display = 'none';
        this.errorMessage.classList.remove('fade-in');
        this.successMessage.classList.remove('fade-in');
    }
    
    showLoading(show) {
        if (show) {
            this.loadingOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            this.loadingOverlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
    
    // Cleanup method
    destroy() {
        // Stop all ongoing processes
        this.stopRecognition();
        speechSynthesis.cancel();
        this.stopVisualization();
        
        // Clean up audio context
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        // Remove event listeners (if needed for SPA)
        // This would be more relevant in a single-page application context
        console.log('AudioTranscriptionHub destroyed');
    }
}

// Add API endpoint URL here
const API_URL = 'https://your-backend-url/api/upload';

const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const resultDiv = document.getElementById('result');

// Client-side JS for TXT, PDF, DOCX
function readTextFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        resultDiv.textContent = e.target.result;
    };
    reader.readAsText(file);
}

function readPDFFile(file) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const typedarray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({data: typedarray}).promise;
        let text = '';
        for (let i = 0; i < pdf.numPages; i++) {
            const page = await pdf.getPage(i + 1);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
        }
        resultDiv.textContent = text;
    };
    reader.readAsArrayBuffer(file);
}

function readDocxFile(file) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        const arrayBuffer = e.target.result;
        const mammoth = window.mammoth;
        const result = await mammoth.convertToHtml({arrayBuffer});
        resultDiv.innerHTML = result.value;
    };
    reader.readAsArrayBuffer(file);
}

uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) {
        resultDiv.textContent = 'Please select a file.';
        return;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'txt') {
        readTextFile(file);
    } else if (ext === 'pdf') {
        readPDFFile(file);
    } else if (ext === 'docx') {
        readDocxFile(file);
    } else {
        // For audio/zip or advanced processing, use Python backend
        resultDiv.textContent = 'Processing on server...';
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.result) {
                resultDiv.textContent = data.result;
            } else if (data.error) {
                resultDiv.textContent = 'Error: ' + data.error;
            } else {
                resultDiv.textContent = 'Unknown response.';
            }
        } catch (err) {
            resultDiv.textContent = 'Failed to connect to backend.';
        }
    }
});

// Utility functions for global access
window.app = null;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new AudioTranscriptionHub();
        console.log('Audio Transcription Hub loaded successfully');
        
        // Add some helpful console messages for developers
        console.log('%c🎵 Audio Transcription Hub', 'color: #667eea; font-size: 18px; font-weight: bold;');
        console.log('%cKeyboard Shortcuts:', 'color: #764ba2; font-weight: bold;');
        console.log('• Ctrl/Cmd + S: Download transcript');
        console.log('• Ctrl/Cmd + C: Copy transcript (when textarea is focused)');
        console.log('• Ctrl/Cmd + R: Toggle recording');
        console.log('• Space: Toggle recording (when not typing)');
        console.log('%cFor support and updates, visit: https://github.com/your-repo', 'color: #666;');
        
    } catch (error) {
        console.error('Failed to initialize Audio Transcription Hub:', error);
        
        // Show fallback error message
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; font-family: Arial, sans-serif;">
                <div style="background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; backdrop-filter: blur(10px);">
                    <h1>⚠️ Initialization Error</h1>
                    <p>Failed to load the Audio Transcription Hub.</p>
                    <p>Please refresh the page or check the browser console for details.</p>
                    <button onclick="location.reload()" style="background: white; color: #667eea; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-top: 20px;">Reload Page</button>
                </div>
            </div>
        `;
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioTranscriptionHub;
}