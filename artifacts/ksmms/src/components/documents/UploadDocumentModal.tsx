import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { Upload, X, FileText } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

const DOCUMENT_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'proof_of_residence', label: 'Proof of Residence' },
  { value: 'payslip', label: 'Payslip' },
  { value: 'contract', label: 'Contract' },
  { value: 'collateral', label: 'Collateral Document' },
  { value: 'other', label: 'Other' },
];

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'client_kyc' | 'guarantor_kyc' | 'loan' | 'collateral';
  entityId: string;
  onSuccess: () => void;
}

export default function UploadDocumentModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  onSuccess,
}: UploadDocumentModalProps) {
  const { addNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('national_id');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
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
      addNotification('success', `${selectedFile.name} uploaded successfully`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      addNotification('error', err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    if (uploading) return;
    setSelectedFile(null);
    setDocumentType('national_id');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Document" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
          <Select
            options={DOCUMENT_TYPES}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
              selectedFile
                ? 'border-teal-400 bg-teal-50'
                : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
            } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {selectedFile ? (
              <>
                <FileText className="h-8 w-8 text-teal-600" />
                <p className="text-sm font-medium text-teal-700 text-center break-all">{selectedFile.name}</p>
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

        {uploading && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading} loading={uploading}>
            <Upload className="h-4 w-4 mr-1" /> Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
}
