/**
 * Deep Scan Routes — Server-side repository scanning endpoints
 */
const express = require('express');
const router = express.Router();

// Simple in-memory scan status store
const scanJobs = new Map();

/** POST /github — Deep scan a GitHub repository */
router.post('/github', async (req, res) => {
  const { owner, repo, branch = 'main' } = req.body;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'owner and repo are required' });
  }

  const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Store scan job metadata
  scanJobs.set(scanId, {
    id: scanId,
    status: 'queued',
    owner,
    repo,
    branch,
    createdAt: new Date().toISOString(),
    progress: { phase: 'queued', current: 0, total: 0 }
  });

  // Return scan ID immediately (scanning happens client-side via GitHub API)
  res.json({
    scanId,
    status: 'queued',
    message: `Deep scan queued for ${owner}/${repo}@${branch}`,
    estimatedTime: '30-120 seconds depending on repo size'
  });
});

/** POST /upload — Scan uploaded files */
router.post('/upload', express.json({ limit: '10mb' }), async (req, res) => {
  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'files array is required' });
  }

  if (files.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 files allowed' });
  }

  const scanId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  scanJobs.set(scanId, {
    id: scanId,
    status: 'processing',
    source: 'upload',
    fileCount: files.length,
    createdAt: new Date().toISOString()
  });

  res.json({
    scanId,
    status: 'accepted',
    fileCount: files.length,
    message: `${files.length} files accepted for scanning`
  });
});

/** GET /status/:scanId — Get scan progress */
router.get('/status/:scanId', (req, res) => {
  const job = scanJobs.get(req.params.scanId);

  if (!job) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  res.json(job);
});

// Cleanup old scan jobs every 30 minutes
setInterval(() => {
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of scanJobs) {
    if (new Date(job.createdAt).getTime() < thirtyMinAgo) {
      scanJobs.delete(id);
    }
  }
}, 30 * 60 * 1000);

module.exports = router;
