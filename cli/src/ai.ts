import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import type { AuditReport, AiProvider } from './types.js';
import { readGlobalConfig } from './config.js';

export async function generateAiSummary(
  report: AuditReport,
  provider: AiProvider = 'gemini',
  modelOverride?: string
): Promise<string> {
  const criticalAndHigh = report.findings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 20); // Cap to avoid huge prompts

  const prompt = buildPrompt(report, criticalAndHigh);

  if (provider === 'gemini') {
    return generateGeminiSummary(prompt, modelOverride);
  } else if (provider === 'openai') {
    return generateOpenAiSummary(prompt, modelOverride);
  } else if (provider === 'claude') {
    return generateClaudeSummary(prompt, modelOverride);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function generateGeminiSummary(prompt: string, modelOverride?: string): Promise<string> {
  const config = readGlobalConfig();
  const apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Please run the setup or set the environment variable.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = modelOverride || 'gemini-2.5-flash';
  
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text || '';
}

async function generateOpenAiSummary(prompt: string, modelOverride?: string): Promise<string> {
  const config = readGlobalConfig();
  const apiKey = process.env.OPENAI_API_KEY || config.openaiApiKey;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing. Please run the setup or set the environment variable.');
  }

  const client = new OpenAI({ apiKey });
  const model = modelOverride || 'gpt-4o';

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.choices[0]?.message?.content || '';
}

async function generateClaudeSummary(prompt: string, modelOverride?: string): Promise<string> {
  const config = readGlobalConfig();
  const apiKey = process.env.ANTHROPIC_API_KEY || config.claudeApiKey;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is missing. Please run the setup or set the environment variable.');
  }

  const client = new Anthropic({ apiKey });
  const model = modelOverride || 'claude-3-5-sonnet-latest';

  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('\n');

  return text;
}

function buildPrompt(
  report: AuditReport,
  topFindings: AuditReport['findings'],
): string {
  const summary = report.summary;
  const findingsList = topFindings
    .map(
      (f) =>
        `- [${f.severity.toUpperCase()}] [${f.category}] ${f.title}${f.file ? ` in ${f.file}${f.line ? `:${f.line}` : ''}` : ''}`,
    )
    .join('\n');

  return `You are a security expert reviewing an automated security audit report.

The tool "auditx" scanned the following project:
- Target: ${report.meta.target}
- Stack: ${report.meta.stack.join(', ')}
- Scanners used: ${report.meta.scanners.join(', ')}

Summary of findings:
- Critical: ${summary.critical}
- High: ${summary.high}
- Medium: ${summary.medium}
- Low: ${summary.low}

Top critical/high findings:
${findingsList || '(none)'}

Please provide:
1. A concise **Risk Summary** (2–3 sentences) explaining the overall security posture
2. A **Priority Fix Order** (numbered list) of the most important actions to take
3. **What an attacker can do** with the current findings (bullet points, be specific)

Keep it actionable and concise. Format your response in Markdown.`;
}
