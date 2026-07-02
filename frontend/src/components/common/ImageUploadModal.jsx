import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Upload, Image, Layout, AlertCircle, Loader2 } from 'lucide-react';

/**
 * ImageUploadModal
 * A React modal component that handles local image file selection, drag-and-drop,
 * and Cloudinary upload with configuration selections (Inline Image vs. Background Image).
 * 
 * Props:
 * - isOpen (boolean): Controls visibility of the modal.
 * - onClose (function): Callback to close the modal.
 * - onUploadSuccess (function): Callback invoked upon successful upload. Receives final state payload.
 *   Callback signature: (url, placementType, publicId) => void
 * - uploadEndpoint (string): Optional custom endpoint for the API upload. Defaults to '/api/upload/image'.
 */
export default function ImageUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  uploadEndpoint = '/api/upload/image'
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Clean up Object URL to prevent memory leaks when preview changes or component unmounts
  const revokePreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      revokePreview();
      setError(null);
      setIsUploading(false);
    }
  }, [isOpen, revokePreview]);

  // Drag and Drop Event Handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = useCallback((file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WEBP, GIF).');
      return;
    }

    // Limit to 5MB frontend validation
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size allowed is 5MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create a local object URL for instant visual preview
    revokePreview();
    setPreviewUrl(URL.createObjectURL(file));
  }, [revokePreview]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleFileChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Performs the actual upload to the Express server.
   * Then calls the parent callbacks with the chosen layout placement.
   */
  const handleUpload = async (placementType) => {
    if (!selectedFile) {
      setError('Please select or drop an image file first.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    // Parameter name matches standard multer setup "image"
    formData.append('image', selectedFile);

    try {
      const response = await axios.post(uploadEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.success) {
        const { secure_url, public_id } = response.data;
        // Invoke callback to pass state changes upwards
        onUploadSuccess(secure_url, placementType, public_id);
        onClose();
      } else {
        throw new Error(response.data?.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      setError(
        err.response?.data?.error || 
        err.message || 
        'An error occurred during upload. Please check your connection and credentials.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with elegant blur */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
        onClick={isUploading ? null : onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all transform animate-slide-up duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80">
          <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            Upload Asset
          </h2>
          {!isUploading && (
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-3 text-red-200 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Upload Error</p>
                <p className="opacity-90">{error}</p>
              </div>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={previewUrl ? null : triggerFileInput}
            className={`relative min-h-[220px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 ${
              previewUrl 
                ? 'border-indigo-500 bg-slate-950/20' 
                : isDragging
                ? 'border-indigo-400 bg-indigo-500/10 scale-[0.98]'
                : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {previewUrl ? (
              // Selected Preview Content
              <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative group rounded-lg overflow-hidden border border-slate-800 max-h-[160px]">
                  <img
                    src={previewUrl}
                    alt="Upload Preview"
                    className="max-h-[150px] w-auto object-contain rounded-md"
                  />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        revokePreview();
                      }}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 transition-colors shadow-md"
                    >
                      Remove File
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  <p className="font-medium text-slate-300 truncate max-w-[280px]">
                    {selectedFile?.name}
                  </p>
                  <p className="opacity-75">
                    {(selectedFile?.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              // Idle Dropzone Content
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-950/50 flex items-center justify-center border border-indigo-900/30">
                  <Upload className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Drag and drop your image here, or{' '}
                    <span className="text-indigo-400 hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports PNG, JPG, WEBP, and GIF (Max 5MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Choice Buttons */}
          {previewUrl && (
            <div className="grid grid-cols-2 gap-3">

<button
onClick={() =>
handleUpload('inline')
}
className="
py-3
rounded-xl
bg-blue-600
text-white
"
>
Use as Image
</button>

<button
onClick={() =>
handleUpload('background')
}
className="
py-3
rounded-xl
bg-purple-600
text-white
"
>
Use as Background + Text
</button>

</div>
          )}
        </div>

        {/* Global Loading Spinner Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-50 animate-fade-in">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              <p className="text-slate-200 font-semibold text-sm animate-pulse">
                Uploading to Cloudinary...
              </p>
              <p className="text-xs text-slate-500">
                Piping image buffer to storage server
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
