import { Injectable, Logger } from '@nestjs/common';
import { createChatflowMachine } from './machine.xstate';
import { GroqService } from 'src/groq/groq.service';
import { ActorRefFrom, createActor } from 'xstate';

type ChatflowActor = ActorRefFrom<ReturnType<typeof createChatflowMachine>>;

@Injectable()
export class MachineService {
  private actors: Record<string, ChatflowActor> = {};
  private logger: Logger = new Logger(MachineService.name);

  constructor(private readonly groqService: GroqService) {}

  public getOrCreateActor(sessionId: string): ChatflowActor {
    if (!this.actors[sessionId]) {
      const machine = createChatflowMachine(this.groqService);
      this.actors[sessionId] = createActor(machine).start();
      this.logger.log(`New machine created - session id: ${sessionId}`);
    }
    return this.actors[sessionId];
  }

  public async interpretMessage(
    sessionId: string,
    message: string,
  ): Promise<string[]> {
    this.logger.log('Starting machine message interpretation');
    const actor = this.getOrCreateActor(sessionId);

    let snapshot = actor.getSnapshot();
    const lastStateValue = snapshot.value;

    const eventType = this.mapInputToEvent(message, lastStateValue as string);

    actor.send({ type: eventType as string, value: message });

    await this.sleep(1200);

    snapshot = actor.getSnapshot();

    this.logger.log('Obtaining messages from the machine');
    const responses = snapshot.context.responses || [];

    actor.send({ type: 'CLEAR_RESPONSES' });

    this.logger.log('Sending responses to the chatbot');
    return responses;
  }

  private mapInputToEvent(input: string, lastState: string): string | null {
    this.logger.log('Classifying the event type to send for the machine');
    const trimmed = input.trim().toLowerCase();
    if (lastState === 'menu') {
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
        return 'QUICK_GUIDANCE';
      }
    }
    if (lastState === 'schedule_appointment_flow') {
      if (trimmed === '1' || trimmed.includes('agendar')) {
        return 'SCHEDULE';
      }
      if (trimmed === '2' || trimmed.includes('verificar')) {
        return 'VERIFY';
      }
    }
    if (lastState === 'quick_guidance_flow') {
      if (
        trimmed === '1' ||
        trimmed.includes('vacinação') ||
        trimmed.includes('vacinacao')
      ) {
        return 'VACCINATION_FLOW';
      }
      if (
        trimmed === '2' ||
        trimmed.includes('medidas') ||
        trimmed.includes('higiene')
      ) {
        return 'HYGIENE_MEASURES_FLOW';
      }
      if (
        trimmed === '3' ||
        trimmed.includes('situacoes') ||
        trimmed.includes('situações') ||
        trimmed.includes('urgencia') ||
        trimmed.includes('urgência')
      ) {
        return 'URGENCY_SITUATION_FLOW';
      }
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
    if (lastState === 'check_user_or_other_person_vaccination') {
      if (trimmed === '2' || trimmed === 'pessoa' || trimmed === 'outra') {
        return 'OTHER_PERSON';
      }
      if (trimmed === '1' || trimmed === 'mim' || trimmed === 'eu') {
        return 'MYSELF';
      }
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

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

}