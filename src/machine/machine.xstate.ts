import { assign, createMachine, fromPromise } from 'xstate';
import { ChatMessage } from '../chat/chat.types';
import { GroqService } from 'src/groq/groq.service';

interface ChatflowContext {
  userInput: string;
  response: string;
  nextState?: string;
  history: ChatMessage[];
}

export const createChatflowMachine = (groqService: GroqService) =>
  createMachine(
    {
      id: 'chatflow',
      initial: 'start',
      context: {
        userInput: '',
        response: '',
        nextState: '',
        history: [] as ChatMessage[],
      },
      on: {
        UPDATE_HISTORY: {
          actions: assign({
            history: ({ event }) => event.history,
          }),
        },
      },
      states: {
        start: {
          after: {
            3000: {
              target: 'menu_interaction',
            },
          },
          entry: assign({
            response: `Olá, eu sou o assistente virtual do SUS! `,
          }),
        },
        menu_interaction: {
          on: {
            HEALTH_ISSUE_INFORM: 'health_issue_inform',
            SCHEDULE_APPOINTMENT: 'schedule_appointment',
            QUICK_INFO: 'quick_info',
          },
          entry: assign({
            response: `Você gostaria de: \n1) Informar um problema de saúde \n2) Agendar ou confirmar uma consulta/procedimento \n 3) Orientações rápidas\n `,
          }),
        },
        health_issue_inform: {
          on: {
            USER_INPUT: {
              target: 'health_issue_analysis',
              actions: assign({
                userInput: ({ event }) => event.value,
              }),
            },
          },
          entry: assign({
            response: `Entendi!\nPara te ajudar melhor, preciso saber:\nQual o seu principal sintoma?\n(Febre, dor, tosse, falta de ar, outro...)`,
          }),
        },
        health_issue_analysis: {
          invoke: {
            src: 'askLlamaGroq',
            input: ({ context: { userInput } }) => userInput,
            onDone: {
              target: 'health_issue_response',
              actions: [
                assign({
                  nextState: ({ event }) => {
                    const newState = event.output;
                    return newState;
                  },
                }),
              ],
            },
            onError: {
              target: 'error',
              actions: assign({
                response: 'Erro ao analisar sintomas. Tente novamente.',
              }),
            },
          },
        },
        health_issue_response: {
          always: [
            {
              target: 'health_issue_mild_symptoms',
              guard: ({ context }) =>
                context.nextState === 'health_issue_mild_symptoms',
            },
            {
              target: 'health_issue_severe_symptoms',
              guard: ({ context }) =>
                context.nextState === 'health_issue_severe_symptoms',
            },
            { target: 'error' },
          ],
        },

        health_issue_mild_symptoms: {
          entry: assign({
            response: `Com base no que você disse, você pode tomar algumas preucações ainda em casa \nRepouse e se hidrate. \nSe os sintomas persistirem ou piorarem, busque a UBS mais próxima de vocÊ`,
          }),
          on: {
            STILL_NEED_HELP: 'still_need_help',
          },
        },
        health_issue_severe_symptoms: {
          entry: assign({
            response: `Seus sintomas indicam alerta! \nProcure o hospital mais perto de você para ser atendido prontamente!`,
          }),
          on: {
            STILL_NEED_HELP: 'still_need_help',
          },
        },
        schedule_appointment: {
          on: {},
        },
        quick_info: {},
        still_need_help: {
          entry: assign({
            response: `Há mais algo em que eu possa ajudar?`,
          }),
          on: {
            YES: 'menu_interaction',
            NO: 'end_session',
          },
        },
        error: {
          always: [{ target: 'menu_interaction' }],
          entry: assign({
            response: 'Desculpe, houve um erro. Tente novamente.',
          }),
        },
        end_session: {
          type: 'final',
          entry: assign({
            response: `Certo! Obrigada por usar o assistente virtual do SUS!`,
          }),
        },
      },
    },
    {
      actors: {
        askLlamaGroq: fromPromise(async ({ input }: { input: string }) => {
          try {
            console.log(input);
            if (!input) {
              throw new Error('Input inválido');
            }
            const prompt: ChatMessage[] = [
              {
                role: 'system',
                content:
                  'Analise os sintomas e classifique como leves ou graves. Retorne apenas: {"response": "Sua resposta", "nextState": "health_issue_mild_symptoms" ou "health_issue_severe_symptoms"}',
              },
              { role: 'user', content: input },
            ];

            const rawResponse = await groqService.askGroq(prompt);
            const parsed = JSON.parse(rawResponse) as {
              response: string;
              nextState: string;
            };
            console.log();
            return parsed.nextState;
          } catch (error) {
            console.error(error);
            return {
              response: 'Erro na análise. Tente novamente.',
              nextState: 'error',
            };
          }
        }),
      },
    },
  );
