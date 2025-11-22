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

  public getMachine(): Record<string, any> {
    if (this.sessionId) {
      const id = this.sessionId;
      const machine = this.machine[id];
      return machine;
    }
    return {
      message: 'Não foi possível encontrar a máquina',
      sessionId: this.sessionId,
    };
  }

  public createMachine(sessionId: string) {
    this.sessionId = sessionId;
    if (!this.machine[sessionId]) {
      try {
        let machine: any = {};
        if (this.groqService) {
          machine = createChatflowMachine(this.groqService);
        }
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

  private getSnapshot() {
    const machine = this.getMachine() as Record<string, any>;

    return machine.getSnapshot();
  }

  private getContext() {
    const snapshot = this.getSnapshot();

    return snapshot.context;
  }

  private invokeStateResolve() {}

  // public async interpretMessage(
  //   message: string,
  //   history: ChatMessage[],
  // ): Promise<string[]> {
  //   const machine = this.getMachine();
  //   let snapshot = this.getSnapshot();
  //   const initialState = snapshot.value;
  //   const responses: string[] = [];

  //   const eventType = this.mapInputToEvent(message);
  //   machine.send({ type: eventType, value: message, history });

  //   snapshot = this.getSnapshot();

  //   // Adiciona a resposta inicial (do estado após send)
  //   if (snapshot.context.response) {
  //     responses.push(snapshot.context.response);
  //   }

  //   if (snapshot.children && Object.keys(snapshot.children).length > 0) {
  //     // Lógica para invokes (da primeira versão, mas com captura melhorada)
  //     return new Promise((resolve) => {
  //       const sub = machine.subscribe((newSnapshot) => {
  //         if (newSnapshot.value !== initialState) {
  //           responses.push(newSnapshot.context.response);
  //           sub.unsubscribe();
  //           resolve(responses);
  //         }
  //       });
  //     });
  //   } else {
  //     // Lógica para afters (mistura: da primeira versão, mas com timeout maior e sem else if precoce)
  //     return new Promise((resolve) => {
  //       const sub = machine.subscribe((newSnapshot) => {
  //         // Captura mudança de estado (incluindo via after), sem resolver se não mudou
  //         if (
  //           newSnapshot.value !== initialState &&
  //           newSnapshot.context.response
  //         ) {
  //           responses.push(newSnapshot.context.response);
  //           sub.unsubscribe();
  //           resolve(responses);
  //         }
  //       });
  //       // Timeout maior (1000ms) para dar tempo ao after (500ms) + margem
  //       setTimeout(() => {
  //         sub.unsubscribe();
  //         resolve(responses); // Resolve com o que tem (pelo menos a resposta inicial)
  //       }, 1200);
  //     });
  //   }
  // }

  public async interpretMessage(
    message: string,
    history: ChatMessage[],
  ): Promise<string[]> {
    const machine = this.getMachine();

    let snapshot = this.getSnapshot();
    const responses: string[] = [];

    let lastStateValue = snapshot.value;

    const eventType = this.mapInputToEvent(message);
    machine.send({ type: eventType, value: message });

    snapshot = this.getSnapshot();
    if (snapshot.context.response) {
      responses.push(snapshot.context.response);
    }

    // Se o estado mudou imediatamente (transição síncrona), atualizamos o rastreador
    lastStateValue = snapshot.value;

    // 4. Inicia monitorização assíncrona para capturar a cadeia de eventos (Invoke -> After -> Etc)
    return new Promise((resolve) => {
      let silenceTimer: NodeJS.Timeout;
      let isResolved = false;

      // Função para finalizar e devolver tudo o que coletamos
      const finish = () => {
        if (isResolved) return;
        isResolved = true;
        sub.unsubscribe(); // Para de ouvir a máquina
        resolve(responses);
      };

      // Função para reiniciar o tempo de espera (Janela de Coleta)
      // Usamos 2000ms para garantir que cobre o teu 'after' de 600ms com folga
      const resetTimer = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(finish, 1000);
      };

      const sub = machine.subscribe((newSnapshot) => {

        if (
          JSON.stringify(newSnapshot.value) !==
            JSON.stringify(lastStateValue) &&
          newSnapshot.context.response
        ) {
          const lastResponse = responses[responses.length - 1];
          if (lastResponse !== newSnapshot.context.response) {
            responses.push(newSnapshot.context.response);
          }

          lastStateValue = newSnapshot.value;

          resetTimer();
        }
        
      });

     
      resetTimer();
    });
  }
}
