import type {
  ConfidenceLevel,
  ImpactLevel,
  Priority,
  Probability,
} from '../types/diagnosis';
import type { AnalysisStatus } from '../types/database';

export type BadgeVariant =
  | 'positive'
  | 'warning'
  | 'danger'
  | 'critical'
  | 'info'
  | 'neutral';

/** Mapeia nível de impacto para a variante visual do badge. */
export function getImpactBadgeVariant(level: ImpactLevel | null | undefined): BadgeVariant {
  switch (level) {
    case 'baixo':
      return 'positive';
    case 'medio':
      return 'warning';
    case 'alto':
      return 'danger';
    case 'critico':
      return 'critical';
    default:
      return 'neutral';
  }
}

export const IMPACT_LABELS: Record<ImpactLevel, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
  critico: 'Crítico',
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  baixo: 'Baixa',
  medio: 'Média',
  alto: 'Alta',
};

export const PROBABILITY_LABELS: Record<Probability, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

export function getPriorityBadgeVariant(priority: Priority | null | undefined): BadgeVariant {
  switch (priority) {
    case 'baixa':
      return 'info';
    case 'media':
      return 'warning';
    case 'alta':
      return 'danger';
    case 'critica':
      return 'critical';
    default:
      return 'neutral';
  }
}

export function getProbabilityBadgeVariant(p: Probability | null | undefined): BadgeVariant {
  switch (p) {
    case 'baixa':
      return 'positive';
    case 'media':
      return 'warning';
    case 'alta':
      return 'danger';
    default:
      return 'neutral';
  }
}

export const STATUS_LABELS: Record<AnalysisStatus, string> = {
  rascunho: 'Rascunho',
  processando: 'Processando',
  em_revisao: 'Em revisão',
  finalizado: 'Finalizado',
  erro: 'Erro',
};

export function getStatusBadgeVariant(status: AnalysisStatus | null | undefined): BadgeVariant {
  switch (status) {
    case 'rascunho':
      return 'neutral';
    case 'processando':
      return 'info';
    case 'em_revisao':
      return 'warning';
    case 'finalizado':
      return 'positive';
    case 'erro':
      return 'danger';
    default:
      return 'neutral';
  }
}

export const ECONOMIC_PROFILE_LABELS: Record<string, string> = {
  comercio: 'Comércio',
  servico: 'Serviço',
  industria: 'Indústria',
  operacao_mista: 'Operação mista',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  tecnologia: 'Tecnologia',
  saude: 'Saúde',
  educacao: 'Educação',
  turismo: 'Turismo',
  construcao: 'Construção',
  locacao: 'Locação',
  intermediacao: 'Intermediação',
  outro: 'Outro',
};
