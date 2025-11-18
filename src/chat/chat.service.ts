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

  private getOrCreateConversationHistory(sessionId: string) {
    if (!this.conversations[sessionId]) {
      this.conversations[sessionId] = [];
      this.machineService.getOrCreateMachine(sessionId);
    }
  }

  async handleMessage(
    dto: SendMessageDTO,
  ): Promise<{ reply: string; history: ChatMessage[] }> {
    const sessionId = dto.sessionId || uuidv4();
    this.getOrCreateConversationHistory(sessionId);

    this.machineService.interpretMessage(dto.message);

    await new Promise((resolve) => setTimeout(resolve, 100)); // Hack simples; idealmente, observe o ator
    const snapshot = machine.getSnapshot();

    console.log(
      'Estado atual da máquina:',
      snapshot.value,
      'Contexto:',
      snapshot.context,
    );

    const reply = snapshot.context.response;

    this.conversations[sessionId].push({ role: 'user', content: dto.message });
    this.conversations[sessionId].push({ role: 'assistant', content: reply });
    return { reply, history: this.conversations[sessionId] };
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
