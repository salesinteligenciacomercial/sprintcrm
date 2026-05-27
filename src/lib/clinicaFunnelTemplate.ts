/**
 * Funil padrão Clínica + templates de Follow Inteligente por etapa.
 * Usado pelo botão "Criar Funil Clínica" no Kanban.
 */

export interface ClinicaEtapaTemplate {
  nome: string;
  cor: string;
  posicao: number;
  follow?: {
    tempo_valor: number;
    tempo_unidade: "minutos" | "horas" | "dias";
    canal: "whatsapp" | "tarefa" | "notificacao";
    mensagem_custom?: string;
    tarefa_titulo?: string;
    notificar_responsavel?: boolean;
  };
}

export const CLINICA_FUNNEL_NAME = "Jornada do Paciente";

export const CLINICA_ETAPAS: ClinicaEtapaTemplate[] = [
  {
    nome: "Novo Contato",
    cor: "#94a3b8",
    posicao: 0,
    follow: {
      tempo_valor: 1,
      tempo_unidade: "horas",
      canal: "whatsapp",
      mensagem_custom:
        "Olá {{primeiro_nome}}! Recebemos seu contato e em breve vamos te ajudar a agendar sua consulta. Pode me confirmar o melhor horário?",
    },
  },
  {
    nome: "Contato Realizado",
    cor: "#3b82f6",
    posicao: 1,
    follow: {
      tempo_valor: 1,
      tempo_unidade: "dias",
      canal: "whatsapp",
      mensagem_custom:
        "Oi {{primeiro_nome}}, ainda tem interesse em agendar sua consulta? Posso reservar um horário pra você essa semana?",
    },
  },
  {
    nome: "Agendamento Feito",
    cor: "#eab308",
    posicao: 2,
    follow: {
      tempo_valor: 1,
      tempo_unidade: "dias",
      canal: "whatsapp",
      mensagem_custom:
        "Oi {{primeiro_nome}}, passando para confirmar sua consulta. Posso confirmar sua presença?",
    },
  },
  {
    nome: "Consulta Confirmada",
    cor: "#06b6d4",
    posicao: 3,
    follow: {
      tempo_valor: 30,
      tempo_unidade: "minutos",
      canal: "whatsapp",
      mensagem_custom:
        "Oi {{primeiro_nome}}, estamos te aguardando! Sua consulta começa em instantes.",
    },
  },
  {
    nome: "Compareceu",
    cor: "#22c55e",
    posicao: 4,
  },
  {
    nome: "Procedimento Realizado",
    cor: "#16a34a",
    posicao: 5,
    follow: {
      tempo_valor: 1,
      tempo_unidade: "dias",
      canal: "whatsapp",
      mensagem_custom:
        "Olá {{primeiro_nome}}! Como foi sua experiência conosco? Sua opinião é muito importante.",
    },
  },
  {
    nome: "Pós-Consulta",
    cor: "#8b5cf6",
    posicao: 6,
    follow: {
      tempo_valor: 30,
      tempo_unidade: "dias",
      canal: "whatsapp",
      mensagem_custom:
        "Oi {{primeiro_nome}}, já se passaram 30 dias. Que tal agendar seu retorno?",
    },
  },
  {
    nome: "Retorno / Recorrência",
    cor: "#0ea5e9",
    posicao: 7,
    follow: {
      tempo_valor: 90,
      tempo_unidade: "dias",
      canal: "whatsapp",
      mensagem_custom:
        "Oi {{primeiro_nome}}! Está na hora do seu acompanhamento. Vamos agendar?",
    },
  },
  {
    nome: "Não Compareceu",
    cor: "#f97316",
    posicao: 8,
    follow: {
      tempo_valor: 1,
      tempo_unidade: "dias",
      canal: "whatsapp",
      mensagem_custom:
        "Oi {{primeiro_nome}}, sentimos sua falta hoje! Posso te reagendar para essa semana?",
    },
  },
  {
    nome: "Perdido",
    cor: "#ef4444",
    posicao: 9,
  },
];

// Detecção: o funil Clínica é reconhecido pelo nome OU por ter as etapas chave
export const CLINICA_ETAPAS_CHAVE = {
  AGENDAMENTO_FEITO: "Agendamento Feito",
  CONSULTA_CONFIRMADA: "Consulta Confirmada",
  COMPARECEU: "Compareceu",
  PROCEDIMENTO: "Procedimento Realizado",
  POS_CONSULTA: "Pós-Consulta",
  RETORNO: "Retorno / Recorrência",
  NO_SHOW: "Não Compareceu",
  PERDIDO: "Perdido",
};
