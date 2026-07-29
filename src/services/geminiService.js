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

export async function simulateHackerAttackWithGemini({
  code,
  filename = 'project_context.ts',
  language = 'typescript',
  customPolicies = []
}) {
  const response = await lunarApi.reviewCodeWithAi({
    code,
    filename,
    language,
    operation: 'hacker_attack_simulation',
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

export async function getConfiguredAiProviders() {
  const response = await lunarApi.getAiProviders();
  return response.providers;
}
