/**
 * Labels adaptáveis para empresas do segmento Clínica.
 * Uso: `leadLabel(isClinica)` → "Paciente" | "Lead"
 */

export const leadLabel = (isClinica: boolean, plural = false) =>
  isClinica ? (plural ? "Pacientes" : "Paciente") : (plural ? "Leads" : "Lead");

export const newLeadLabel = (isClinica: boolean) =>
  isClinica ? "Novo Paciente" : "Novo Lead";

export const dealLabel = (isClinica: boolean) =>
  isClinica ? "Atendimento" : "Negócio";

export const opportunityLabel = (isClinica: boolean) =>
  isClinica ? "consultas" : "oportunidades";

export const saleLabel = (isClinica: boolean) =>
  isClinica ? "Procedimento" : "Venda";
