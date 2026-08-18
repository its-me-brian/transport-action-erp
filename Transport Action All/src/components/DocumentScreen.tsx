import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Search, 
  Loader2, 
  File, 
  Image, 
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';
import { ScreenId } from '../types';
import { 
  DocumentDTO, 
  getDocuments, 
  createDocument,
  deleteDocument 
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface DocumentScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

const MIME_ICONS: Record<string, typeof File> = {
  'application/pdf': File,
  'image/png': Image,
  'image/jpeg': Image,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'text/csv': FileSpreadsheet,
};

export default function DocumentScreen({ onNavigate }: DocumentScreenProps) {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const result = await getDocuments();
      if (Array.isArray(result)) {
        setDocuments(result);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteDocument(id);
      if (result.error) {
        alert('Error: ' + result.error);
        return;
      }
      setDeleteConfirm(null);
      await loadDocuments();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Convert file to base64 data URL for storage
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await createDocument({
        entityType: 'general',
        entityId: 'uploads',
        fileName: file.name,
        fileUrl: dataUrl,
        mimeType: file.type || 'application/octet-stream',
      });

      if (result.error) {
        alert('Error uploading: ' + result.error);
        return;
      }

      await loadDocuments();
    } catch (err: any) {
      alert('Error uploading: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filtered = documents.filter(doc => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return doc.fileName.toLowerCase().includes(q) || 
           doc.entityType.toLowerCase().includes(q) ||
           doc.entityId.toLowerCase().includes(q);
  });

  const getIcon = (mimeType: string) => {
    return MIME_ICONS[mimeType] || File;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT');
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="document-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      {/* Header */}
      <header id="document-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Documents</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls,.doc,.docx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </header>

      {/* Filters */}
      <div id="document-filters" className="flex flex-col gap-2 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
          />
        </div>
      </div>

      {/* Documents List */}
      <div id="documents-list" className="flex flex-col gap-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-[13px] text-on-surface-variant">Loading documents...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <FileText className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery ? 'No documents match your search' : 'No documents yet'}
            </span>
          </div>
        ) : (
          filtered.map(doc => {
            const IconComponent = getIcon(doc.mimeType);
            return (
              <div
                key={doc.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center gap-3 hover:bg-surface-dim/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-on-surface truncate">{doc.fileName}</div>
                  <div className="text-[11px] text-on-surface-variant">
                    {doc.entityType} • {doc.entityId} • {formatDate(doc.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    title="Open"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {deleteConfirm === doc.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="px-2 py-1 bg-red-500 text-white text-[11px] font-medium rounded hover:bg-red-600 transition-colors cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 bg-surface-container text-on-surface-variant text-[11px] font-medium rounded hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(doc.id)}
                      className="p-1.5 text-on-surface-variant hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
