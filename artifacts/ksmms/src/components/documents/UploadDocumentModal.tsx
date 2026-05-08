import { useState, useRef, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { Upload, X, FileText, Camera, RefreshCw, ZoomIn } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

export const INDIVIDUAL_DOC_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'proof_of_residence', label: 'Proof of Residence' },
  { value: 'proof_of_employment', label: 'Proof of Employment' },
  { value: 'payslip', label: 'Payslip' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'guarantor_document', label: 'Guarantor Document' },
  { value: 'collateral_insurance', label: 'Collateral & Insurance' },
  { value: 'disbursement_form', label: 'Disbursement Form' },
  { value: 'other', label: 'Other' },
];

export const BUSINESS_DOC_TYPES = [
  { value: 'cr14', label: 'CR14 — Certificate of Incorporation' },
  { value: 'cr6', label: 'CR6 — Particulars of Directors' },
  { value: 'director_id', label: "Director's ID Document" },
  { value: 'proof_of_business_address', label: 'Proof of Business Address' },
  { value: 'business_plan', label: 'Business Plan' },
  { value: 'collateral_document', label: 'Collateral Document' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'national_id', label: 'National ID (Contact Person)' },
  { value: 'passport', label: 'Passport (Contact Person)' },
  { value: 'other', label: 'Other' },
];

const DOCUMENT_TYPES = INDIVIDUAL_DOC_TYPES;

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'client_kyc' | 'guarantor_kyc' | 'loan' | 'collateral';
  entityId: string;
  onSuccess: () => void;
  documentTypes?: { value: string; label: string }[];
}

type Tab = 'upload' | 'camera';

export default function UploadDocumentModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  onSuccess,
  documentTypes,
}: UploadDocumentModalProps) {
  const activeDocTypes = documentTypes ?? DOCUMENT_TYPES;
  const { addNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [tab, setTab] = useState<Tab>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState(() => (documentTypes ?? DOCUMENT_TYPES)[0]?.value ?? 'national_id');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  async function startCamera() {
    setCameraError(null);
    setCapturedImage(null);
    setCapturedFile(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access was denied. Please allow camera permissions and try again.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Unable to access the camera. Please try uploading a file instead.');
      }
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();

    canvas.toBlob((blob) => {
      if (blob) {
        const docLabel = DOCUMENT_TYPES.find((d) => d.value === documentType)?.label ?? 'scan';
        const fileName = `${docLabel.replace(/\s+/g, '_')}_scan_${Date.now()}.jpg`;
        setCapturedFile(new File([blob], fileName, { type: 'image/jpeg' }));
      }
    }, 'image/jpeg', 0.92);
  }

  function retake() {
    setCapturedImage(null);
    setCapturedFile(null);
    startCamera();
  }

  async function handleUpload() {
    const fileToUpload = tab === 'camera' ? capturedFile : selectedFile;
    if (!fileToUpload) return;
    setUploading(true);
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId);
      formData.append('document_type', documentType);

      setProgress(50);

      const res = await fetch('/api/documents', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      setProgress(90);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      setProgress(100);
      addNotification('success', `${fileToUpload.name} uploaded successfully`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      addNotification('error', err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      addNotification('error', 'Only PDF and image files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addNotification('error', 'File must be smaller than 10 MB');
      return;
    }
    setSelectedFile(file);
  }

  function handleClose() {
    if (uploading) return;
    stopCamera();
    setSelectedFile(null);
    setCapturedImage(null);
    setCapturedFile(null);
    setCameraError(null);
    setDocumentType(activeDocTypes[0]?.value ?? 'national_id');
    setProgress(0);
    setTab('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  }

  function switchTab(t: Tab) {
    if (t === tab) return;
    stopCamera();
    setCapturedImage(null);
    setCapturedFile(null);
    setCameraError(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTab(t);
  }

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  const canSubmit = tab === 'upload' ? !!selectedFile : !!capturedFile;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Document" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
          <Select
            options={activeDocTypes}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            disabled={uploading}
          />
        </div>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
          <button
            type="button"
            onClick={() => switchTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 transition-colors ${
              tab === 'upload'
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Upload className="h-4 w-4" /> Upload File
          </button>
          <button
            type="button"
            onClick={() => switchTab('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 transition-colors border-l border-gray-200 ${
              tab === 'camera'
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Camera className="h-4 w-4" /> Scan with Camera
          </button>
        </div>

        {tab === 'upload' && (
          <div>
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
              } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {selectedFile ? (
                <>
                  <FileText className="h-8 w-8 text-brand-600" />
                  <p className="text-sm font-medium text-brand-700 text-center break-all">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Remove
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-600">Click to select a file</p>
                  <p className="text-xs text-gray-400">PDF, JPG, PNG up to 10 MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>
        )}

        {tab === 'camera' && (
          <div className="space-y-3">
            {cameraError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {cameraError}
              </div>
            )}

            {!cameraActive && !capturedImage && !cameraError && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-8">
                <Camera className="h-10 w-10 text-gray-400" />
                <p className="text-sm text-gray-600 text-center">Use your device camera to scan a document</p>
                <Button type="button" onClick={startCamera} variant="outline">
                  <Camera className="h-4 w-4 mr-2" /> Open Camera
                </Button>
              </div>
            )}

            {cameraError && (
              <div className="flex justify-center">
                <Button type="button" onClick={startCamera} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                </Button>
              </div>
            )}

            {cameraActive && !capturedImage && (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none border-4 border-brand-400 rounded-lg opacity-40" />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="border-2 border-white border-dashed rounded w-3/4 h-3/4 opacity-50" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">Position the document within the frame, then capture</p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="h-14 w-14 rounded-full bg-brand-600 hover:bg-brand-700 flex items-center justify-center shadow-lg transition-colors"
                    title="Capture"
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </button>
                </div>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                  <img src={capturedImage} alt="Captured document" className="w-full h-full object-contain" />
                  <a
                    href={capturedImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1.5 text-white"
                    title="View full size"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </a>
                </div>
                <p className="text-xs text-gray-500 text-center">Review your scan. Retake if the document is unclear.</p>
                <div className="flex justify-center">
                  <Button type="button" variant="outline" size="sm" onClick={retake} disabled={uploading}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Retake
                  </Button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {uploading && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!canSubmit || uploading} loading={uploading}>
            <Upload className="h-4 w-4 mr-1" /> Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
}
