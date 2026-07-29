import { lunarApi } from './lunarApi';

export async function reviewCodeWithGemini({
  code,
  filename = 'source.txt',
  language = 'plaintext',
  operation = 'review',
  customPolicies = []
}) {
  const response = await lunarApi.reviewCodeWithAi({
    code,
    filename,
    language,
    operation,
    customPolicies,
    provider: 'gemini'
  });
  return {
    ...response.review,
    provider: response.provider,
    model: response.model,
    latencyMs: response.latencyMs
  };
}

export async function simulateProjectHackerAttack({
  projectFiles,
  repositoryName = 'local-project',
  provider = 'auto'
}) {
  const response = await lunarApi.simulateProjectHackerAttack({
    projectFiles,
    repositoryName,
    provider
  });
  return {
    ...response.simulation,
    provider: response.provider,
    model: response.model,
    latencyMs: response.latencyMs
  };
}

export async function simulateHackerAttackWithGemini({
  code,
  filename = 'project_context.ts',
  language = 'typescript'
}) {
  return simulateProjectHackerAttack({
    projectFiles: [{ path: filename, language, content: code }],
    repositoryName: filename,
    provider: 'gemini'
  });
}

export async function getConfiguredAiProviders() {
  const response = await lunarApi.getAiProviders();
  return response.providers;
}
