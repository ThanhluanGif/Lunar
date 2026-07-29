import { reviewCodeWithGemini } from './geminiService';

function combineFiles(files) {
  return files
    .filter((file) => typeof file.content === 'string' && file.content.trim())
    .map((file) => `// FILE: ${file.path}\n${file.content}`)
    .join('\n\n');
}

export async function analyzeProjectWithAI(projectData, options = {}) {
  const files = Array.isArray(projectData.files) ? projectData.files : [];
  if (files.length === 0) throw new Error('Project has no readable source files.');

  const code = combineFiles(files).slice(0, 120000);
  const review = await reviewCodeWithGemini({
    code,
    filename: projectData.title || 'repository',
    language: projectData.language || 'mixed',
    operation: options.operation || 'repository-review',
    customPolicies: options.customPolicies || []
  });

  const findingsByFile = new Map();
  for (const finding of review.findings || []) {
    const key = finding.filePath || files[0]?.path;
    if (!findingsByFile.has(key)) findingsByFile.set(key, []);
    findingsByFile.get(key).push({
      line: finding.line,
      type: finding.severity,
      title: finding.title,
      message: finding.explanation,
      suggestion: finding.suggestedPatch,
      cwe: finding.cwe
    });
  }

  const scores = {
    naming: review.scores?.bestPractices ?? 0,
    architecture: review.scores?.maintainability ?? 0,
    performance: review.scores?.performance ?? 0,
    security: review.scores?.security ?? 0,
    readability: review.scores?.readability ?? 0
  };
  const overallScore = Math.round(
    Object.values(scores).reduce((sum, score) => sum + Number(score || 0), 0) / 5
  );

  return {
    ...projectData,
    overallScore,
    scores,
    aiSummary: review.summary,
    aiProvider: review.provider,
    aiModel: review.model,
    files: files.map((file) => ({
      ...file,
      annotations: findingsByFile.get(file.path) || []
    }))
  };
}
