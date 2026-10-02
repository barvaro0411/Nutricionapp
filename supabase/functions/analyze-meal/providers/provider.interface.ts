import { AIStructuredOutput } from "../types.ts";

export interface VisionProviderResult {
  data: AIStructuredOutput;
  tokensPrompt?: number;
  tokensCompletion?: number;
  providerName: string;
}

export interface VisionProvider {
  readonly name: string;
  analyzeImage(
    imageBase64: string,
    mimeType: string,
    prompt: string,
    clientTimeIso?: string,
    userNote?: string
  ): Promise<VisionProviderResult>;
}
