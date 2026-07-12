import * as vscode from 'vscode';
import { DiffChange } from './diffEngine';

function buildPrompt(change: DiffChange): string {
  return `You are a subtitle generator for an AI code assistant.
Summarize this code change in 3-8 words starting with a present-participle verb.
Only return the subtitle text. No punctuation at the end. No quotes.
Examples: "Adding JWT authentication", "Fixing null pointer bug", "Writing unit tests", "Refactoring API routes"

File: ${change.filename}
Changes:
${change.diff}`;
}

function cleanResult(raw: string): string {
  let result = raw.trim();
  // Remove surrounding quotes
  result = result.replace(/^["'`]|["'`]$/g, '');
  // Remove trailing punctuation
  result = result.replace(/[.!?,;]+$/, '');
  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result.trim();
}

export class Summarizer {
  private hasShownConfigWarning = false;
  private outputChannel: vscode.OutputChannel;

  constructor(
    private config: vscode.WorkspaceConfiguration,
    outputChannel: vscode.OutputChannel,
  ) {
    this.outputChannel = outputChannel;
  }

  updateConfig(config: vscode.WorkspaceConfiguration) {
    this.config = config;
  }

  async summarize(change: DiffChange): Promise<string | null> {
    const provider = this.config.get<string>('provider', 'gemini');
    const prompt = buildPrompt(change);

    try {
      switch (provider) {
        case 'gemini':
          return await this.summarizeWithGemini(prompt);
        case 'claude':
          return await this.summarizeWithClaude(prompt);
        case 'openai':
          return await this.summarizeWithOpenAI(prompt);
        case 'ollama':
          return await this.summarizeWithOllama(prompt);
        default:
          this.outputChannel.appendLine(`[Summarizer] Unknown provider: ${provider}`);
          return null;
      }
    } catch (err) {
      this.outputChannel.appendLine(`[Summarizer] Error with provider ${provider}: ${err}`);
      return null;
    }
  }

  private async summarizeWithGemini(prompt: string): Promise<string | null> {
    const apiKey = this.config.get<string>('geminiApiKey', '');
    const model = this.config.get<string>('geminiModel', 'gemini-1.5-flash');

    if (!apiKey) {
      this.showConfigWarning();
      return null;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 20, temperature: 0.3 },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      this.outputChannel.appendLine(`[Summarizer] Gemini error ${response.status}: ${err}`);
      vscode.window.showErrorMessage(`CodeCaptions Gemini Error (${response.status}): ${err.substring(0, 150)}`);
      return null;
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? cleanResult(text) : null;
  }

  private async summarizeWithClaude(prompt: string): Promise<string | null> {
    const apiKey = this.config.get<string>('claudeApiKey', '');
    const model = this.config.get<string>('claudeModel', 'claude-haiku-20240307');

    if (!apiKey) {
      this.showConfigWarning();
      return null;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 20,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      this.outputChannel.appendLine(`[Summarizer] Claude error ${response.status}: ${err}`);
      vscode.window.showErrorMessage(`CodeCaptions Claude Error (${response.status}): ${err.substring(0, 150)}`);
      return null;
    }

    const data = await response.json() as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = data?.content?.find((c) => c.type === 'text')?.text;
    return text ? cleanResult(text) : null;
  }

  private async summarizeWithOpenAI(prompt: string): Promise<string | null> {
    const apiKey = this.config.get<string>('openaiApiKey', '');
    const model = this.config.get<string>('openaiModel', 'gpt-4o-mini');

    if (!apiKey) {
      this.showConfigWarning();
      return null;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 20,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      this.outputChannel.appendLine(`[Summarizer] OpenAI error ${response.status}: ${err}`);
      vscode.window.showErrorMessage(`CodeCaptions OpenAI Error (${response.status}): ${err.substring(0, 150)}`);
      return null;
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content;
    return text ? cleanResult(text) : null;
  }

  private async summarizeWithOllama(prompt: string): Promise<string | null> {
    const baseUrl = this.config.get<string>('ollamaUrl', 'http://localhost:11434');
    const model = this.config.get<string>('ollamaModel', 'qwen2.5-coder');

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { num_predict: 20 },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      this.outputChannel.appendLine(`[Summarizer] Ollama error ${response.status}: ${err}`);
      vscode.window.showErrorMessage(`CodeCaptions Ollama Error (${response.status}): ${err.substring(0, 150)}`);
      return null;
    }

    const data = await response.json() as { response?: string };
    const text = data?.response;
    return text ? cleanResult(text) : null;
  }

  private showConfigWarning() {
    if (!this.hasShownConfigWarning) {
      this.hasShownConfigWarning = true;
      vscode.window.showInformationMessage(
        'CodeCaptions: Configure your AI provider in Settings (codecaptions.provider)',
        'Open Settings',
      ).then((selection) => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'codecaptions');
        }
      });
    }
  }
}
