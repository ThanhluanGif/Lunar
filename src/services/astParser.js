import { parse } from '@babel/parser';

function calleeName(node) {
  if (!node) return '';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    return `${calleeName(node.object)}.${calleeName(node.property)}`.replace(/^\./, '');
  }
  return '';
}

function sourceFor(node, code) {
  if (!Number.isInteger(node?.start) || !Number.isInteger(node?.end)) return '';
  return code.slice(node.start, node.end).slice(0, 500);
}

function finding(node, code, values) {
  return {
    ...values,
    line: node.loc?.start?.line || 0,
    originalCode: sourceFor(node, code),
    aiVerdict: 'Requires review',
    aiConfidence: null,
    aiReason: 'AST evidence from a JavaScript/TypeScript syntax node.',
    patchedCode: ''
  };
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'extra', 'tokens', 'comments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}

export function findJavaScriptNonExecutableRanges(code) {
  let ast;
  try {
    ast = parse(String(code || ''), {
      sourceType: 'unambiguous',
      errorRecovery: true,
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'dynamicImport',
        'optionalChaining',
        'topLevelAwait'
      ]
    });
  } catch {
    return [];
  }
  const ignoredTypes = new Set([
    'StringLiteral',
    'DirectiveLiteral',
    'RegExpLiteral',
    'TemplateElement',
    'JSXText'
  ]);
  const ranges = [];
  walk(ast.program, (node) => {
    if (
      ignoredTypes.has(node.type)
      && Number.isInteger(node.start)
      && Number.isInteger(node.end)
    ) {
      ranges.push([node.start, node.end]);
    }
  });
  return ranges;
}

export function analyzeJavaScriptAst(code, filePath = 'source.js') {
  let ast;
  try {
    ast = parse(String(code || ''), {
      sourceType: 'unambiguous',
      errorRecovery: true,
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'dynamicImport',
        'optionalChaining',
        'topLevelAwait'
      ]
    });
  } catch (error) {
    return { parsed: false, error: error.message, findings: [] };
  }

  const findings = [];
  walk(ast.program, (node) => {
    if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
      const name = calleeName(node.callee);
      if (['eval', 'Function'].includes(name) || name.endsWith('.eval')) {
        findings.push(finding(node, code, {
          ruleId: 'AST-JS-001',
          cwe: 'CWE-95',
          title: 'Dynamic code execution call',
          severity: 'CRITICAL',
          cvss: 9.8,
          recommendation: 'Replace dynamic execution with a strict parser or allowlisted dispatcher.'
        }));
      }
      if (/^(child_process\.)?(exec|execSync|spawn)$/.test(name)) {
        findings.push(finding(node, code, {
          ruleId: 'AST-JS-002',
          cwe: 'CWE-78',
          title: 'Operating-system command execution call',
          severity: 'CRITICAL',
          cvss: 9.8,
          recommendation: 'Avoid a shell and pass fixed arguments to a constrained process API.'
        }));
      }
      if (name === 'jwt.decode' || name.endsWith('.decodeJwt')) {
        findings.push(finding(node, code, {
          ruleId: 'AST-JS-003',
          cwe: 'CWE-347',
          title: 'JWT decoded without visible signature verification',
          severity: 'CRITICAL',
          cvss: 9.1,
          recommendation: 'Verify signature, issuer, audience, expiry and algorithm.'
        }));
      }
    }

    if (
      node.type === 'AssignmentExpression'
      && calleeName(node.left).endsWith('.innerHTML')
    ) {
      findings.push(finding(node, code, {
        ruleId: 'AST-JS-004',
        cwe: 'CWE-79',
        title: 'Assignment to innerHTML',
        severity: 'HIGH',
        cvss: 8.2,
        recommendation: 'Use textContent or sanitize explicitly trusted HTML with an allowlist.'
      }));
    }

    if (
      node.type === 'NewExpression'
      && ['Function', 'vm.Script'].includes(calleeName(node.callee))
    ) {
      findings.push(finding(node, code, {
        ruleId: 'AST-JS-005',
        cwe: 'CWE-95',
        title: 'Runtime code compilation',
        severity: 'CRITICAL',
        cvss: 9.8,
        recommendation: 'Remove runtime compilation of untrusted strings.'
      }));
    }
  });

  return { parsed: true, filePath, findings };
}
