import { Injectable } from '@nestjs/common';
import { SendMessageDTO } from './dto/send-message.dto';
import { GroqService } from 'src/groq/groq.service';
import { ChatMessage } from './chat.types';
import { v4 as uuidv4 } from 'uuid';
import { MachineService } from 'src/machine/machine.service';

@Injectable()
export class ChatService {
  private conversations: Record<string, ChatMessage[]> = {};
  constructor(
    private readonly groqService: GroqService,
    private readonly machineService: MachineService,
  ) {}

  private createConversationHistory(sessionId: string) {
    if (!this.conversations[sessionId]) {
      this.conversations[sessionId] = [];
      this.machineService.getOrCreateActor(sessionId);
    }
  }

  async handleMessage(dto: SendMessageDTO): Promise<{
    replies: string[];
    history: ChatMessage[];
  }> {
    const sessionId = dto.sessionId || uuidv4();
    this.createConversationHistory(sessionId);

    this.conversations[sessionId].push({ role: 'user', content: dto.message });
    const history = this.conversations[sessionId];

    const responses = await this.machineService.interpretMessage(
      sessionId,
      dto.message,
    );

    responses.forEach((res) => {
      history.push({ role: 'assistant', content: res });
    });

    return { replies: responses, history };
  }

  stateSystemAsGenAIChatbot(sessionId: string): void {
    if (!this.conversations[sessionId]) {
      this.conversations[sessionId] = [];
      this.conversations[sessionId].push({
        role: 'system',
        content: `Seu nome é IASYS. Você deve falar em Português.
          Você é um assitente prestativo, que está participando do projeto PET Saúde Digital, cujo objetivo é assistir à Saúde Pública em Petrolina. 
          Seja humilde e carismático ao falar, mas não se gabe disso.`,
      });
    }
  }

  async handleMessageAsGenAIChatbot(
    dto: SendMessageDTO,
  ): Promise<{ reply: string; history: ChatMessage[] }> {
    const sessionId = dto.sessionId || uuidv4();

    this.conversations[sessionId].push({ role: 'user', content: dto.message });

    let response: string;
    try {
      response = await this.groqService.askGroq(this.conversations[sessionId]);
    } catch (error) {
      response = 'Desculpe, houve um erro ao processar sua mensagem.';
    }

    this.conversations[sessionId].push({
      role: 'assistant',
      content: response,
    });

    return { reply: response, history: this.conversations[sessionId] };
  }
}