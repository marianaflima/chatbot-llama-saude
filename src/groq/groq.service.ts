import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk';
import { ChatMessage } from 'src/chat/chat.types';

@Injectable()
export class GroqService {
  private readonly apiKey: string | undefined;
  private readonly modelId: string | undefined;
  private readonly groqClient: Groq;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GROQ_API_KEY');
    this.modelId = this.configService.get<string>('MODEL_ID');
    const apiKey = this.apiKey;

    if (!apiKey) {
      throw new Error('API Key não encontrada');
    }

    this.groqClient = new Groq({ apiKey });
  }

  async askGroq(messages: ChatMessage[]): Promise<string> {
    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const completion = await this.groqClient.chat.completions.create({
      messages: formattedMessages,
      model: this.modelId as string,
      temperature: 0.1,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
      stop: null,
    });

    return completion.choices[0]?.message?.content || '';
  }
}