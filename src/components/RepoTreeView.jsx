import React, { useState, useMemo } from 'react';
import { File, Folder, FolderOpen, ChevronRight, ChevronDown, CheckCircle, AlertTriangle, XCircle, Search, Filter } from 'lucide-react';

/**
 * RepoTreeView — File tree visualization with scan status
 * Props:
 *  - files: Array<{ path, type, size, scanResult: { score, vulnCount, severity } }>
 *  - onSelectFile(file): callback
 *  - selectedFile: current selected path
 */
export default function RepoTreeView({ files = [], onSelectFile, selectedFile }) {
  const [expandedDirs, setExpandedDirs] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name | severity | vulns

  // Build tree structure from flat file list
  const tree = useMemo(() => {
    const root = { name: '/', children: {}, type: 'dir' };

    const filteredFiles = searchQuery
      ? files.filter(f => f.path?.toLowerCase().includes(searchQuery.toLowerCase()))
      : files;

    // Sort files
    const sorted = [...filteredFiles].sort((a, b) => {
      if (sortBy === 'severity') {
        const sevOrder = { critical: 0, high: 1, medium: 2, safe: 3 };
        return (sevOrder[a.scanResult?.severity] ?? 4) - (sevOrder[b.scanResult?.severity] ?? 4);
      }
      if (sortBy === 'vulns') {
        return (b.scanResult?.vulnCount || 0) - (a.scanResult?.vulnCount || 0);
      }
      return (a.path || '').localeCompare(b.path || '');
    });

    sorted.forEach(file => {
      const parts = (file.path || '').split('/');
      let current = root;

      parts.forEach((part, idx) => {
        if (idx === parts.length - 1) {
          // File node
          current.children[part] = {
            name: part,
            path: file.path,
            type: 'file',
            size: file.size,
            scanResult: file.scanResult || file
          };
        } else {
          // Directory node
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              path: parts.slice(0, idx + 1).join('/'),
              type: 'dir',
              children: {}
            };
          }
          current = current.children[part];
        }
      });
    });

    return root;
  }, [files, searchQuery, sortBy]);

  const toggleDir = (path) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const expandAll = () => {
    const allDirs = new Set();
    const collect = (node, prefix = '') => {
      Object.values(node.children || {}).forEach(child => {
        if (child.type === 'dir') {
          allDirs.add(child.path);
          collect(child);
        }
      });
    };
    collect(tree);
    setExpandedDirs(allDirs);
  };

  // Get status icon for a file
  const getStatusIcon = (scanResult) => {
    if (!scanResult) return <File size={14} style={{ color: '#A1A1AA' }} />;
    const sev = scanResult.severity;
    if (sev === 'critical') return <XCircle size={14} style={{ color: '#DC2626' }} />;
    if (sev === 'high') return <AlertTriangle size={14} style={{ color: '#EA580C' }} />;
    if (sev === 'medium') return <AlertTriangle size={14} style={{ color: '#CA8A04' }} />;
    return <CheckCircle size={14} style={{ color: '#059669' }} />;
  };

  // Get worst status from children
  const getDirStatus = (node) => {
    let worst = 'safe';
    const sevOrder = { critical: 3, high: 2, medium: 1, safe: 0 };
    const traverse = (n) => {
      Object.values(n.children || {}).forEach(child => {
        if (child.type === 'file' && child.scanResult) {
          const sev = child.scanResult.severity || 'safe';
          if ((sevOrder[sev] || 0) > (sevOrder[worst] || 0)) worst = sev;
        }
        if (child.type === 'dir') traverse(child);
      });
    };
    traverse(node);
    return worst;
  };

  // Render tree node
  const renderNode = (node, depth = 0) => {
    if (node.type === 'dir' && node.name !== '/') {
      const isExpanded = expandedDirs.has(node.path);
      const dirStatus = getDirStatus(node);
      const childCount = Object.keys(node.children || {}).length;
      const statusColors = { critical: '#DC2626', high: '#EA580C', medium: '#CA8A04', safe: '#059669' };

      return (
        <div key={node.path}>
          <div
            onClick={() => toggleDir(node.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', paddingLeft: 8 + depth * 16,
              cursor: 'pointer', borderRadius: 4,
              fontSize: 13, fontFamily: 'Inter, sans-serif',
              color: '#09090B',
              background: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F4F4F5'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {isExpanded ? <ChevronDown size={14} style={{ color: '#71717A' }} /> : <ChevronRight size={14} style={{ color: '#71717A' }} />}
            {isExpanded ? <FolderOpen size={14} style={{ color: '#4F46E5' }} /> : <Folder size={14} style={{ color: '#4F46E5' }} />}
            <span style={{ fontWeight: 500 }}>{node.name}</span>
            <span style={{ fontSize: 11, color: '#A1A1AA', marginLeft: 4 }}>({childCount})</span>
            {dirStatus !== 'safe' && (
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
                background: statusColors[dirStatus] + '15', color: statusColors[dirStatus],
                marginLeft: 'auto'
              }}>{dirStatus.toUpperCase()}</span>
            )}
          </div>
          {isExpanded && Object.values(node.children)
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map(child => renderNode(child, depth + 1))}
        </div>
      );
    }

    if (node.type === 'file') {
      const isSelected = selectedFile === node.path;
      const vulnCount = node.scanResult?.vulnCount || 0;

      return (
        <div
          key={node.path}
          onClick={() => onSelectFile && onSelectFile(node)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', paddingLeft: 8 + (depth) * 16,
            cursor: 'pointer', borderRadius: 4,
            fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
            color: isSelected ? '#4F46E5' : '#52525B',
            background: isSelected ? '#F3EEFF' : 'transparent',
            borderLeft: isSelected ? '2px solid #4F46E5' : '2px solid transparent'
          }}
          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F4F4F5'; }}
          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
        >
          {getStatusIcon(node.scanResult)}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>
          {vulnCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center',
              background: node.scanResult?.severity === 'critical' ? '#DC2626' : '#EA580C',
              color: '#fff'
            }}>{vulnCount}</span>
          )}
        </div>
      );
    }

    // Root level — render children directly
    return Object.values(node.children || {})
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map(child => renderNode(child, depth));
  };

  const totalVulns = files.reduce((sum, f) => sum + (f.scanResult?.vulnCount || f.vulnCount || 0), 0);

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E4E4E7',
      borderRadius: 12,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #E4E4E7',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 6,
          background: '#F4F4F5', borderRadius: 6, padding: '6px 10px'
        }}>
          <Search size={14} style={{ color: '#71717A' }} />
          <input
            type="text"
            placeholder="Tìm file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#09090B',
              width: '100%'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 2 }}>
          {[
            { key: 'name', label: 'Tên' },
            { key: 'severity', label: 'Mức độ' },
            { key: 'vulns', label: 'Lỗi' }
          ].map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key)} style={{
              padding: '4px 8px', borderRadius: 4, border: 'none',
              fontSize: 11, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
              background: sortBy === s.key ? '#4F46E5' : '#F4F4F5',
              color: sortBy === s.key ? '#fff' : '#52525B'
            }}>{s.label}</button>
          ))}
        </div>

        <button onClick={expandAll} style={{
          padding: '4px 8px', borderRadius: 4, border: '1px solid #E4E4E7',
          fontSize: 11, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
          background: '#FAFAFA', color: '#52525B'
        }}>Mở tất cả</button>
      </div>

      {/* Stats bar */}
      <div style={{
        padding: '6px 16px', borderBottom: '1px solid #E4E4E7',
        display: 'flex', gap: 12, fontSize: 11, fontFamily: 'Inter, sans-serif', color: '#71717A',
        background: '#FAFAFA'
      }}>
        <span>{files.length} files</span>
        <span>{totalVulns} lỗ hổng</span>
        <span>{files.filter(f => (f.scanResult?.severity || f.severity) === 'critical').length} critical</span>
      </div>

      {/* Tree */}
      <div style={{
        maxHeight: 480, overflowY: 'auto', padding: '4px 0'
      }}>
        {files.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#A1A1AA', fontSize: 13 }}>
            Chưa có kết quả quét
          </div>
        ) : (
          renderNode(tree)
        )}
      </div>
    </div>
  );
}
