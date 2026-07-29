import React, { useState, useRef, useCallback } from 'react';
import { Upload, FolderUp, File, AlertCircle, X, Loader, CheckCircle } from 'lucide-react';

/**
 * Scannable file extensions
 */
const SCANNABLE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'py', 'java', 'go', 'php', 'rb', 'cs', 'rs', 'sql',
  'sh', 'bash', 'kt', 'swift', 'dart', 'scala',
  'vue', 'svelte', 'html', 'css', 'scss',
  'json', 'yml', 'yaml', 'xml', 'toml',
  'env', 'cfg', 'ini', 'properties',
  'dockerfile', 'makefile', 'tf'
]);

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', 'vendor', '__pycache__',
  '.next', 'coverage', '.cache', 'target', 'bin', 'obj'
]);

/**
 * FolderDropZone — Drag & drop zone for local project upload
 * Props:
 *  - onFilesSelected(files): callback with [{name, path, content, size, type}]
 *  - isScanning: boolean
 *  - maxFileSize: max bytes per file (default 1MB)
 *  - maxTotalFiles: max file count (default 500)
 */
export default function FolderDropZone({
  onFilesSelected,
  isScanning = false,
  maxFileSize = 1024 * 1024,
  maxTotalFiles = 500
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  /** Check if file is scannable */
  const isScannable = (path) => {
    const parts = path.split('/');
    // Skip vendor directories
    for (const part of parts.slice(0, -1)) {
      if (SKIP_DIRS.has(part.toLowerCase())) return false;
    }
    const filename = parts[parts.length - 1].toLowerCase();
    const ext = filename.includes('.') ? filename.split('.').pop() : filename;
    if (filename === 'dockerfile' || filename === 'makefile') return true;
    return SCANNABLE_EXTENSIONS.has(ext);
  };

  /** Read files and filter/validate */
  const processFiles = useCallback(async (fileList) => {
    setError('');
    setIsLoading(true);

    try {
      const validFiles = [];
      const skipped = [];

      for (const file of Array.from(fileList)) {
        if (validFiles.length >= maxTotalFiles) {
          setError(`Tối đa ${maxTotalFiles} files. Một số file đã bị bỏ qua.`);
          break;
        }

        const path = file.webkitRelativePath || file.name;

        // Skip non-scannable
        if (!isScannable(path)) {
          skipped.push(path);
          continue;
        }

        // Skip too large
        if (file.size > maxFileSize) {
          skipped.push(`${path} (quá lớn: ${(file.size / 1024).toFixed(0)}KB)`);
          continue;
        }

        // Read file content
        try {
          const content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Read error'));
            reader.readAsText(file);
          });

          validFiles.push({
            name: path,
            path: path,
            content,
            size: file.size,
            type: file.type || 'text/plain'
          });
        } catch {
          skipped.push(`${path} (đọc lỗi)`);
        }
      }

      if (validFiles.length === 0) {
        setError('Không tìm thấy file code hợp lệ. Hỗ trợ: .js, .py, .ts, .java, .go, .php, .sql, ...');
        setIsLoading(false);
        return;
      }

      setSelectedFiles(validFiles);
      if (onFilesSelected) onFilesSelected(validFiles);
    } catch (err) {
      setError(`Lỗi xử lý files: ${err.message}`);
    }

    setIsLoading(false);
  }, [maxFileSize, maxTotalFiles, onFilesSelected]);

  /** Drag handlers */
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); if (!isScanning) setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isScanning) return;

    const items = e.dataTransfer.items;
    const allFiles = [];

    // Try to get all files from dropped folder
    if (items) {
      const entries = [];
      for (const item of items) {
        const entry = item.webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }

      const readAllEntries = async (entry, path = '') => {
        if (entry.isFile) {
          return new Promise((resolve) => {
            entry.file(file => {
              Object.defineProperty(file, 'webkitRelativePath', {
                value: path + file.name, writable: false
              });
              allFiles.push(file);
              resolve();
            });
          });
        }
        if (entry.isDirectory) {
          const reader = entry.createReader();
          const children = await new Promise(resolve => reader.readEntries(resolve));
          for (const child of children) {
            await readAllEntries(child, path + entry.name + '/');
          }
        }
      };

      for (const entry of entries) {
        await readAllEntries(entry);
      }
    }

    if (allFiles.length > 0) {
      await processFiles(allFiles);
    } else if (e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  /** Clear selection */
  const clearFiles = () => {
    setSelectedFiles([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const totalSize = selectedFiles.reduce((s, f) => s + f.size, 0);

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragOver ? '#4F46E5' : '#E4E4E7'}`,
          borderRadius: 12,
          padding: selectedFiles.length > 0 ? '16px 24px' : '40px 24px',
          textAlign: 'center',
          background: isDragOver ? '#F3EEFF' : '#FAFAFA',
          transition: 'all 0.2s ease',
          cursor: isScanning ? 'not-allowed' : 'pointer',
          opacity: isScanning ? 0.6 : 1
        }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Loader size={32} style={{ color: '#4F46E5', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#52525B', fontFamily: 'Inter, sans-serif' }}>Đang đọc files...</span>
          </div>
        ) : selectedFiles.length > 0 ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <CheckCircle size={20} style={{ color: '#059669' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#09090B', fontFamily: 'Inter, sans-serif' }}>
                {selectedFiles.length} files code sẵn sàng quét
              </span>
              <button onClick={clearFiles} style={{
                display: 'flex', alignItems: 'center', padding: 4,
                border: 'none', background: 'transparent', cursor: 'pointer', color: '#A1A1AA'
              }}>
                <X size={16} />
              </button>
            </div>
            <span style={{ fontSize: 12, color: '#71717A', fontFamily: 'JetBrains Mono, monospace' }}>
              Tổng: {(totalSize / 1024).toFixed(0)} KB
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Upload size={36} style={{ color: isDragOver ? '#4F46E5' : '#A1A1AA' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#09090B', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>
                Kéo thả folder hoặc files vào đây
              </div>
              <div style={{ fontSize: 12, color: '#71717A', fontFamily: 'Inter, sans-serif' }}>
                Hỗ trợ: JS, TS, Python, Java, Go, PHP, SQL, YAML, JSON, HTML, CSS, Shell...
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 6,
                  border: '1px solid #E4E4E7', background: '#FFFFFF',
                  color: '#09090B', cursor: 'pointer',
                  fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500
                }}
              >
                <File size={14} /> Chọn Files
              </button>
              <button
                onClick={() => folderInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 6,
                  border: 'none', background: '#4F46E5',
                  color: '#FFFFFF', cursor: 'pointer',
                  fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500
                }}
              >
                <FolderUp size={14} /> Chọn Folder
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', marginTop: 8,
          background: '#FFF1F4', borderRadius: 6, border: '1px solid #FDDDE3',
          fontSize: 12, color: '#DC2626', fontFamily: 'Inter, sans-serif'
        }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => processFiles(e.target.files)}
        accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.php,.rb,.cs,.rs,.sql,.sh,.kt,.swift,.dart,.html,.css,.json,.yml,.yaml,.xml,.toml,.env,.vue,.svelte"
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        style={{ display: 'none' }}
        onChange={(e) => processFiles(e.target.files)}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
