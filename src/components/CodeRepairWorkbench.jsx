import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Download,
  ExternalLink,
  GitPullRequest,
  Loader2,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench
} from 'lucide-react';
import { createGitHubSecurityPR } from '../services/githubBotService';
import { simulateProjectHackerAttack } from '../services/geminiService';

function matchesActiveFinding(finding, activeFile, activeVuln) {
  const filePath = activeFile?.path || activeVuln?.filePath;
  if (filePath && finding.affectedFiles?.some((path) => path === filePath || path.endsWith(filePath))) return true;
  if (activeVuln?.cwe && finding.relatedCwes?.includes(activeVuln.cwe)) return true;
  return false;
}

function validatedPatchFor(finding) {
  const remediation = finding?.remediation;
  const patch = remediation?.patchCode || finding?.patchedCode || '';
  const validated = remediation?.patchValidated === true || finding?.patchValidated === true;
  return validated && patch ? patch : '';
}

export default function CodeRepairWorkbench({
  activeFile,
  activeVuln,
  projectAttackSimulation,
  repoUrl,
  onApplyPatch
}) {
  const simulationFinding = useMemo(() => (
    projectAttackSimulation?.findings?.find((finding) => matchesActiveFinding(finding, activeFile, activeVuln))
    || projectAttackSimulation?.findings?.[0]
    || null
  ), [activeFile, activeVuln, projectAttackSimulation]);
  const [viewMode, setViewMode] = useState('side-by-side');
  const [copied, setCopied] = useState(false);
  const [isSimulatingAttack, setIsSimulatingAttack] = useState(false);
  const [simulationError, setSimulationError] = useState('');
  const [liveFinding, setLiveFinding] = useState(simulationFinding);
  const [appliedPatch, setAppliedPatch] = useState('');
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [prResult, setPrResult] = useState(null);

  useEffect(() => {
    setLiveFinding(simulationFinding);
    setAppliedPatch('');
    setSimulationError('');
    setPrResult(null);
  }, [activeFile?.path, activeVuln?.id, simulationFinding]);

  if (!activeVuln && !liveFinding) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
        <ShieldCheck size={42} color="#34d399" />
        <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
          Không có lỗ hổng có bằng chứng để mở Code Repair Workbench.
        </p>
      </div>
    );
  }

  const attackVector = liveFinding?.hackerAttackVector || activeVuln?.hackerAttackVector;
  const remediation = liveFinding?.remediation || activeVuln?.remediation;
  const originalCode = activeFile?.content || activeVuln?.originalCode || '';
  const generatedPatch = validatedPatchFor(liveFinding) || validatedPatchFor(activeVuln);
  const patchedCode = appliedPatch || generatedPatch || originalCode;
  const threatLevel = attackVector?.threatLevel || activeVuln?.severity || liveFinding?.severity || 'MEDIUM';
  const canApplyPatch = Boolean(generatedPatch && generatedPatch !== originalCode);

  const handleSimulateAttack = async () => {
    if (!activeFile?.content) return;
    setIsSimulatingAttack(true);
    setSimulationError('');
    try {
      const simulation = await simulateProjectHackerAttack({
        repositoryName: repoUrl || activeFile.path || 'local-project',
        projectFiles: [{
          path: activeFile.path || 'source.ts',
          language: activeFile.language || 'typescript',
          content: activeFile.content
        }]
      });
      setLiveFinding(
        simulation.findings?.find((finding) => matchesActiveFinding(finding, activeFile, activeVuln))
        || simulation.findings?.[0]
        || null
      );
      if (!simulation.findings?.length) {
        setSimulationError('Không tìm thấy chuỗi tấn công có đủ bằng chứng trong file hiện tại.');
      }
    } catch (error) {
      setSimulationError(error.status === 401
        ? 'Bạn cần đăng nhập để chạy AI Deep Project Scan.'
        : error.message || 'Không thể chạy mô phỏng phòng thủ.');
    } finally {
      setIsSimulatingAttack(false);
    }
  };

  const handleApplyPatch = () => {
    if (!canApplyPatch) return;
    setAppliedPatch(generatedPatch);
    onApplyPatch?.({
      filePath: activeFile?.path || activeVuln?.filePath,
      vulnerabilityId: activeVuln?.id || liveFinding?.id,
      patchedCode: generatedPatch
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(patchedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([patchedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patched_${activeFile?.path?.split('/').pop() || 'code.ts'}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreatePR = async () => {
    setIsCreatingPR(true);
    try {
      const result = await createGitHubSecurityPR(repoUrl, originalCode, patchedCode, {
        ...(activeVuln || liveFinding),
        filePath: activeFile?.path || activeVuln?.filePath,
        githubBlobSha: activeFile?.githubBlobSha
      });
      setPrResult(result);
    } catch (error) {
      setSimulationError(error.message || 'Không thể tạo Pull Request.');
    } finally {
      setIsCreatingPR(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }} data-testid="code-repair-workbench">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '14px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Sparkles size={22} color="var(--accent-purple)" />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>AI Code Repair Workbench</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              {activeVuln?.title || liveFinding?.title} · {activeFile?.path || activeVuln?.filePath}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn btn-sm ${viewMode === 'side-by-side' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('side-by-side')}>
            Side-by-Side
          </button>
          <button className={`btn btn-sm ${viewMode === 'unified' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('unified')}>
            Unified Diff
          </button>
        </div>
      </div>

      <div className="glass-card" style={{
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(244, 63, 94, 0.38)',
        background: 'linear-gradient(135deg, rgba(225,29,72,.08), rgba(159,18,57,.12))'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ShieldAlert size={20} color="#fb7185" />
            <h4 style={{ color: '#fb7185', margin: 0 }}>Threat Attack Scenario</h4>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={handleSimulateAttack} disabled={isSimulatingAttack}>
            {isSimulatingAttack ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
            {isSimulatingAttack ? 'Đang phân tích…' : 'Chạy lại mô phỏng'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span className="badge badge-rose">THREAT {threatLevel}</span>
          <span className="badge badge-purple">{liveFinding?.attackTechnique || activeVuln?.cwe || 'Security weakness'}</span>
          {(liveFinding?.affectedFiles || [activeFile?.path]).filter(Boolean).map((filePath) => (
            <span className="badge badge-cyan" key={filePath}>{filePath}</span>
          ))}
        </div>

        <p style={{ color: '#fecdd3', lineHeight: 1.55, fontSize: '0.85rem' }}>
          <strong>Breach impact:</strong> {attackVector?.breachImpact || activeVuln?.impact || 'Cần xác minh tác động trong môi trường kiểm thử cô lập.'}
        </p>

        <div style={{ marginTop: '14px' }}>
          <div style={{ color: '#fb7185', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px' }}>
            Chuỗi tấn công phòng thủ
          </div>
          <ol style={{ color: '#fecdd3', fontSize: '0.82rem', lineHeight: 1.65, paddingLeft: '20px' }}>
            {(attackVector?.attackChain || ['Chưa có chuỗi tấn công được xác nhận.']).map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>

        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#fb7185', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px' }}>
            <Terminal size={14} /> Payload Sandbox — chỉ hiển thị, không thực thi
          </div>
          <pre data-testid="payload-sandbox" style={{
            background: '#090d16',
            border: '1px solid rgba(244,63,94,.4)',
            borderRadius: '8px',
            padding: '12px',
            color: '#fda4af',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.8rem'
          }}>
            {attackVector?.exploitPayload || '<inert-test-payload-unavailable>'}
          </pre>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '18px', marginBottom: '20px', border: '1px solid rgba(52,211,153,.3)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#34d399', fontWeight: 800, marginBottom: '8px' }}>
          <ShieldCheck size={18} /> Defense Guide
        </div>
        <p style={{ color: 'var(--text-primary)', fontSize: '0.84rem' }}>
          {remediation?.defenseStrategy || activeVuln?.recommendation || 'Chưa có chiến lược vá tự động.'}
        </p>
        <ol style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.65, paddingLeft: '20px' }}>
          {(remediation?.stepByStepGuide || []).map((step) => <li key={step}>{step}</li>)}
        </ol>
        <button className="btn btn-emerald" onClick={handleApplyPatch} disabled={!canApplyPatch || Boolean(appliedPatch)} data-testid="apply-project-patch">
          {appliedPatch ? <CheckCircle size={16} /> : <Wrench size={16} />}
          {appliedPatch ? 'Đã áp dụng bản vá' : '1-Click Apply Patch'}
        </button>
      </div>

      {viewMode === 'side-by-side' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <CodePanel title="BEFORE · Code có lỗi" code={originalCode} color="#fca5a5" background="#1a0d10" />
          <CodePanel title="AFTER · Bản vá đề xuất" code={patchedCode} color="#6ee7b7" background="#0d1f18" />
        </div>
      ) : (
        <pre style={{ background: '#0d1117', padding: '16px', borderRadius: '8px', whiteSpace: 'pre-wrap', marginBottom: '20px' }}>
          <span style={{ color: '#fca5a5' }}>- {originalCode}</span>{'\n'}
          <span style={{ color: '#6ee7b7' }}>+ {patchedCode}</span>
        </pre>
      )}

      {simulationError && (
        <p role="alert" style={{ color: '#fda4af', fontSize: '0.82rem', marginBottom: '12px' }}>{simulationError}</p>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={handleCopy} className="btn btn-secondary">
          {copied ? <CheckCircle size={16} /> : <Copy size={16} />} {copied ? 'Đã copy' : 'Copy bản vá'}
        </button>
        <button onClick={handleDownload} className="btn btn-secondary">
          <Download size={16} /> Tải file đã vá
        </button>
        <button onClick={handleCreatePR} disabled={isCreatingPR || !repoUrl} className="btn btn-emerald">
          {isCreatingPR ? <Loader2 size={16} className="spin" /> : <GitPullRequest size={16} />}
          {isCreatingPR ? 'Đang tạo PR…' : 'Tạo GitHub Pull Request'}
        </button>
      </div>

      {prResult && (
        <a href={prResult.prUrl} target="_blank" rel="noreferrer" className="btn btn-emerald btn-sm" style={{ marginTop: '14px' }}>
          Xem PR #{prResult.prNumber} <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

function CodePanel({ title, code, color, background }) {
  return (
    <div style={{ background, border: `1px solid ${color}55`, borderRadius: '8px', padding: '16px' }}>
      <div style={{ color, fontSize: '0.75rem', fontWeight: 800, marginBottom: '8px' }}>{title}</div>
      <pre style={{ color, margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{code || '// Không có code để hiển thị'}</pre>
    </div>
  );
}
