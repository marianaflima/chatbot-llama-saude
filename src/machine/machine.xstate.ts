import { assign, createMachine, fromPromise } from 'xstate';
import { ChatMessage } from '../chat/chat.types';
import { GroqService } from 'src/groq/groq.service';

interface ChatflowContext {
  userInput: string;
  response: string;
  nextState?: string;
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
      },
      states: {
        start: {
          on: {
            HEALTH_ISSUE_INFORM: 'health_issue_inform',
            SCHEDULE_APPOINTMENT: 'schedule_appointment',
            QUICK_INFO: 'quick_info',
          },
        },
        menu: {
          on: {
            HEALTH_ISSUE_INFORM: 'health_issue_inform',
            SCHEDULE_APPOINTMENT: 'schedule_appointment',
            QUICK_INFO: 'quick_info',
          },
          entry: assign({
            response:
              'Você gostaria de: \n 1) Informar um problema de saúde \n 2) Agendar ou confirmar uma consulta ou procedimento \n 3) Orientações rápidas',
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
          entry: assign({
            response: 'Analisando sintomas...',
          }),
          invoke: {
            src: 'askLlamaForSymptomSeverity',
            input: ({ context: { userInput } }) => userInput,
            onDone: [
              {
                target: 'health_issue_mild_symptoms',
                guard: ({ event }) =>
                  event.output === 'health_issue_mild_symptoms',
                actions: assign({
                  nextState: ({ event }) => event.output,
                }),
              },
              {
                target: 'health_issue_severe_symptoms',
                guard: ({ event }) =>
                  event.output === 'health_issue_severe_symptoms',
                actions: assign({
                  nextState: ({ event }) => event.output,
                }),
              },
            ],
            onError: {
              target: 'error',
              actions: assign({
                response: 'Erro ao analisar sintomas. Tente novamente.',
              }),
            },
          },
        },
        health_issue_mild_symptoms: {
          entry: assign({
            response: `Com base no que você me relatou, você pode tomar algumas preucações ainda em casa: \nLembre-se de Repousar e se hidrate. \nSe os sintomas persistirem ou piorarem, busque a UBS mais próxima de você!`,
          }),
          after: {
            600: {
              target: 'still_need_help',
            },
          },
        },
        health_issue_severe_symptoms: {
          entry: assign({
            response: `Seus sintomas indicam alerta! \nProcure o hospital mais perto de você para ser atendido prontamente!`,
          }),
          after: {
            600: {
              target: 'still_need_help',
            },
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
            YES: 'menu',
            NO: 'end_session',
          },
        },
        error: {
          after: {
            500: {
              target: 'menu',
            },
          },
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
        askLlamaForSymptomSeverity: fromPromise(
          async ({ input }: { input: string }) => {
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
              return parsed.nextState;
            } catch (error) {
              console.error(error);
              return {
                response: 'Erro na análise. Tente novamente.',
                nextState: 'error',
              };
            }
          },
        ),
      },
    },
  );
