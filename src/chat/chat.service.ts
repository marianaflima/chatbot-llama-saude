import { Injectable } from '@nestjs/common';
import { SendMessageDTO } from './dto/send-message.dto';
import { GroqService } from 'src/groq/groq.service';
import { ChatMessage } from './chat.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  private conversations: Record<string, ChatMessage[]> = {};
  constructor(private readonly groqService: GroqService) {}

  async handleMessage(
    dto: SendMessageDTO,
  ): Promise<{ reply: string; history: ChatMessage[] }> {
    const sessionId = dto.sessionId || uuidv4();

    if (!this.conversations[sessionId]) {
      this.conversations[sessionId] = [];
    }

    this.conversations[sessionId].push({ role: 'user', content: dto.message });

    const response = await this.groqService.askGroq(
      this.conversations[sessionId],
    );

    this.conversations[sessionId].push({
      role: 'assistant',
      content: response,
    });

    return { reply: response, history: this.conversations[sessionId] };
  }
}
