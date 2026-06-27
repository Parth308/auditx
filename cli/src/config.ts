import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { select, password } from '@inquirer/prompts';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import chalk from 'chalk';
import type { AiProvider } from './types.js';

interface GlobalConfig {
  aiProvider?: AiProvider;
  aiModel?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
}

const CONFIG_DIR = join(homedir(), '.auditx');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function readGlobalConfig(): GlobalConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeGlobalConfig(config: GlobalConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const current = readGlobalConfig();
  const next = { ...current, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf-8');
}

export async function promptForAiConfig(): Promise<void> {
  const provider = await select({
    message: 'Which AI provider would you like to use for risk analysis?',
    choices: [
      { name: 'Gemini (Google)', value: 'gemini' },
      { name: 'OpenAI (GPT-4o)', value: 'openai' },
      { name: 'Claude (Anthropic)', value: 'claude' },
    ],
    default: 'gemini',
  }) as AiProvider;

  const keyName = provider === 'gemini' 
    ? 'Gemini API Key' 
    : provider === 'openai' 
      ? 'OpenAI API Key' 
      : 'Anthropic API Key';

  const apiKey = await password({
    message: `Enter your ${keyName}:`,
    mask: '*',
  });

  let selectedModel = '';

  try {
    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.list();
      const models = [];
      for await (const m of response) {
        if (m.name && m.name.includes('gemini')) {
          models.push({ name: m.name, value: m.name });
        }
      }
      
      selectedModel = await select({
        message: 'Select a default model:',
        choices: models.length > 0 ? models : [{ name: 'gemini-2.5-flash', value: 'gemini-2.5-flash' }],
        default: 'gemini-2.5-flash'
      });
    } else if (provider === 'openai') {
      const client = new OpenAI({ apiKey });
      const response = await client.models.list();
      const models = response.data
        .filter(m => m.id.includes('gpt'))
        .map(m => ({ name: m.id, value: m.id }))
        .sort((a, b) => b.name.localeCompare(a.name)); // newest first usually

      selectedModel = await select({
        message: 'Select a default model:',
        choices: models.length > 0 ? models : [{ name: 'gpt-4o', value: 'gpt-4o' }],
        default: 'gpt-4o'
      });
    } else if (provider === 'claude') {
      // Hardcoded for now since Models API is very new
      selectedModel = await select({
        message: 'Select a default model:',
        choices: [
          { name: 'Claude 3.5 Sonnet (Latest)', value: 'claude-3-5-sonnet-latest' },
          { name: 'Claude 3.5 Haiku (Latest)', value: 'claude-3-5-haiku-latest' },
          { name: 'Claude 3 Opus (Latest)', value: 'claude-3-opus-latest' },
        ],
        default: 'claude-3-5-sonnet-latest'
      });
    }
  } catch (err: any) {
    console.log(chalk.yellow(`\n  ⚠️  Failed to fetch models: ${err.message}`));
    console.log(chalk.dim('  Using default model for this provider.\n'));
  }

  const update: GlobalConfig = {
    aiProvider: provider,
    aiModel: selectedModel,
  };

  if (provider === 'gemini') update.geminiApiKey = apiKey;
  else if (provider === 'openai') update.openaiApiKey = apiKey;
  else if (provider === 'claude') update.claudeApiKey = apiKey;

  writeGlobalConfig(update);
  console.log(chalk.green('\n  ✅ Configuration saved successfully!\n'));
}
