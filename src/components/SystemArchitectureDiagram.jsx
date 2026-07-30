import React, { useEffect, useState } from 'react';
import { Cpu, RefreshCw, Layers, ShieldCheck, Sparkles, Database, GitBranch, ArrowRight } from 'lucide-react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'strict',
  themeVariables: {
    fontFamily: 'Inter, Mona Sans, sans-serif',
    primaryColor: '#6366f1',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#818cf8',
    lineColor: '#38bdf8',
    secondaryColor: '#a855f7',
    tertiaryColor: '#0f172a'
  }
});

export default function SystemArchitectureDiagram() {
  const [activeDiagram, setActiveDiagram] = useState('c4'); // 'c4' | 'compaction' | 'sast'
  const [renderedSvgDataUrl, setRenderedSvgDataUrl] = useState('');

  const diagrams = {
    c4: `
    graph TD
      User["👤 Developer / Security Auditor"] -->|1. Paste Repo / Upload Local Code| Frontend["🌙 Lunar React 18 UI"]
      Frontend -->|2. Run SAST Scan Engine| SAST["🛡️ Security Scanner Engine (OWASP Top 10)"]
      Frontend -->|3. Save Code Audit Report| Supabase["🗄️ Supabase Database (PostgreSQL)"]
      SAST -->|4. Generate Auto-Fix Patch| DiffView["🔴/🟢 Side-by-Side Diff View"]
      DiffView -->|5. 1-Click PR Trigger| GitHubBot["🤖 GitHub PR Bot Action"]
      
      classDef default fill:#0b0f19,stroke:#6366f1,stroke-width:2px,color:#fff;
      classDef highlight fill:#1e1b4b,stroke:#38bdf8,stroke-width:2px,color:#fff;
      class Frontend,SAST,DiffView highlight;
    `,
    compaction: `
    graph TD
      RawCards["Tầng 0: 10 Thẻ Lẻ (CARD-001 ... CARD-010)"] -->|Nén tự động khi đủ 10 thẻ| MilestoneFile["Tầng 1: 1 File Milestone (MILESTONE-001.json)"]
      MilestoneFile -->|Nén tự động khi đủ 10 Milestones| MasterReport["Tầng 2: 1 Báo Cáo Macro 1 Trang (MASTER_REPORT.md)"]
      
      classDef cardLayer fill:#0f172a,stroke:#a855f7,stroke-width:2px,color:#fff;
      class RawCards,MilestoneFile,MasterReport cardLayer;
    `,
    sast: `
    graph LR
      InputCode["Code Input (.js, .ts, .py)"] -->|Regex & AST Parse| Rules["Rule Inspector"]
      Rules -->|CWE-798| Secrets["Lộ Secrets / API Key"]
      Rules -->|CWE-89| SQLi["SQL Injection"]
      Rules -->|CWE-352| CSRF["Thiếu CSRF Csurf"]
      Secrets & SQLi & CSRF -->|CVSS v3.1 Score| RiskVerdict["Xếp hạng Risk Score & AI Verdict"]
    `
  };

  useEffect(() => {
    async function renderChart() {
      try {
        const id = `mermaid-svg-${Date.now()}`;
        const { svg } = await mermaid.render(id, diagrams[activeDiagram]);
        setRenderedSvgDataUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      } catch (err) {
        console.warn('Mermaid render notice:', err);
      }
    }
    renderChart();
  }, [activeDiagram]);

  return (
    <div className="glass-panel" style={{ padding: '28px', marginBottom: '40px', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(56, 189, 248, 0.4)'
          }}>
            <Cpu size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              Mermaid.js C4 System Architecture Diagram
              <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>LIVE ENGINE</span>
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Trực quan hóa luồng tương tác giữa User, AI SAST Engine, Supabase Database & Compaction Engine
            </p>
          </div>
        </div>

        {/* Diagram Switcher Tabs */}
        <div style={{
          display: 'flex',
          gap: '6px',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '4px',
          borderRadius: 'var(--radius-md)'
        }}>
          <button
            onClick={() => setActiveDiagram('c4')}
            className={`btn btn-sm ${activeDiagram === 'c4' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.78rem' }}
          >
            <Layers size={14} /> C4 Architecture
          </button>
          <button
            onClick={() => setActiveDiagram('compaction')}
            className={`btn btn-sm ${activeDiagram === 'compaction' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.78rem' }}
          >
            <Sparkles size={14} /> 10-in-1 Nén Thẻ
          </button>
          <button
            onClick={() => setActiveDiagram('sast')}
            className={`btn btn-sm ${activeDiagram === 'sast' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.78rem' }}
          >
            <ShieldCheck size={14} /> SAST Pipeline
          </button>
        </div>
      </div>

      {/* Rendered Mermaid.js SVG Diagram */}
      <div
        style={{
          background: 'rgba(11, 15, 25, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '30px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '260px',
          overflowX: 'auto'
        }}
      >
        {renderedSvgDataUrl ? (
          <img
            src={renderedSvgDataUrl}
            alt={`Sơ đồ kiến trúc Lunar: ${activeDiagram}`}
            style={{ display: 'block', width: '100%', maxWidth: '980px', height: 'auto' }}
          />
        ) : (
          <span style={{ color: 'var(--text-secondary)' }}>Đang dựng sơ đồ kiến trúc…</span>
        )}
      </div>
    </div>
  );
}
