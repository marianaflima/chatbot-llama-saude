import { Injectable } from '@nestjs/common';
import { createChatflowMachine } from './machine.xstate';
import { GroqService } from 'src/groq/groq.service';
import { createActor } from 'xstate';
import { ChatMessage } from 'src/chat/chat.types';

@Injectable()
export class MachineService {
  private machine: Record<string, any> = {};
  private sessionId: string = '';

  constructor(private readonly groqService: GroqService) {}

  public getOrCreateMachine(sessionId: string) {
    this.sessionId = sessionId;
    if (!this.machine[sessionId]) {
      try {
        const machine: any = createChatflowMachine(this.groqService);
        if (!machine) {
          throw new Error('Falha ao criar máquina: máquina é null/undefined');
        }
        this.machine[sessionId] = createActor(machine).start();
      } catch (error) {
        console.error(
          'Erro ao criar máquina para sessão',
          sessionId,
          ': ',
          error,
        );
        throw new Error(`Falha na criação da máquina: ${error}`);
      }
    }
  }

  private mapInputToEvent(input: string): string | null {
    const trimmed = input.trim().toLowerCase();
    if (
      trimmed === '1' ||
      trimmed.includes('problema') ||
      trimmed.includes('saúde')
    ) {
      return 'HEALTH_ISSUE_INFORM';
    }
    if (
      trimmed === '2' ||
      trimmed.includes('agendar') ||
      trimmed.includes('consulta')
    ) {
      return 'SCHEDULE_APPOINTMENT';
    }
    if (
      trimmed === '3' ||
      trimmed.includes('orientações') ||
      trimmed.includes('rápidas')
    ) {
      return 'QUICK_INFO';
    }
    if (trimmed === 'sim' || trimmed === 's') {
      return 'YES';
    }
    if (trimmed === 'não' || trimmed === 'n') {
      return 'NO';
    }
    if (trimmed === 'ajuda') {
      return 'STILL_NEED_HELP';
    }
    if (
      ![
        'HEALTH_ISSUE_INFORM',
        'SCHEDULE_APPOINTMENT',
        'QUICK_INFO',
        'YES',
        'NO',
        'STILL_NEED_HELP',
      ].includes(trimmed)
    ) {
      return 'USER_INPUT';
    }
    return trimmed;
  }

  public interpretMessage(message: string, history: ChatMessage[]) {
    this.machine[this.sessionId].send({
      type: 'UPDATE_HISTORY',
      history,
    });
    const eventType = this.mapInputToEvent(message);
    this.machine[this.sessionId].send({
      type: eventType,
      value: message,
      history,
    });
  }

  public getSnapshot(sessionId: string) {
    return this.machine[sessionId].getSnapshot();
  }
}
