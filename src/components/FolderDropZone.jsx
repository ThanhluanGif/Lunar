import React, { useRef, useState } from 'react';
import { FolderOpen, UploadCloud } from 'lucide-react';

export default function FolderDropZone({ onFiles, disabled = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const accept = (list) => {
    const files = Array.from(list || []);
    if (files.length) onFiles?.(files);
  };

  return (
    <div
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) accept(event.dataTransfer.files);
      }}
      style={{
        marginTop: '16px',
        padding: '20px',
        textAlign: 'center',
        borderRadius: '10px',
        border: `1px dashed ${dragging ? '#60a5fa' : 'var(--border-color)'}`,
        background: dragging ? 'rgba(59,130,246,.12)' : 'rgba(15,23,42,.5)'
      }}
    >
      <UploadCloud size={26} color="#60a5fa" />
      <div style={{ margin: '8px 0', fontSize: '.84rem' }}>
        Drop a local project folder here or choose a folder.
      </div>
      <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <FolderOpen size={15} /> Choose folder
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        webkitdirectory=""
        directory=""
        style={{ display: 'none' }}
        onChange={(event) => accept(event.target.files)}
      />
    </div>
  );
}
