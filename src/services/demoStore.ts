/**
 * Armazenamento local para o MODO DEMONSTRAÇÃO.
 *
 * Persiste empresas e análises no localStorage do navegador, permitindo
 * avaliar todo o fluxo (cadastro, análise, revisão, histórico) sem Supabase.
 * Nada aqui vai para servidores externos.
 */

import type { Analysis, Company } from '../types/database';
import { SAMPLE_COMPANIES } from '../data/sampleData';

const COMPANIES_KEY = 'ari_demo_companies';
const ANALYSES_KEY = 'ari_demo_analyses';
const SEEDED_KEY = 'ari_demo_seeded';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora falhas de quota/localStorage indisponível.
  }
}

function ensureSeeded(): void {
  if (read(SEEDED_KEY, false)) return;
  write(COMPANIES_KEY, SAMPLE_COMPANIES);
  write(ANALYSES_KEY, []);
  write(SEEDED_KEY, true);
}

export const demoStore = {
  listCompanies(): Company[] {
    ensureSeeded();
    return read<Company[]>(COMPANIES_KEY, []).sort((a, b) =>
      (b.created_at ?? '').localeCompare(a.created_at ?? ''),
    );
  },

  getCompany(id: string): Company | null {
    ensureSeeded();
    return read<Company[]>(COMPANIES_KEY, []).find((c) => c.id === id) ?? null;
  },

  upsertCompany(company: Company): Company {
    ensureSeeded();
    const companies = read<Company[]>(COMPANIES_KEY, []);
    const idx = companies.findIndex((c) => c.id === company.id);
    if (idx >= 0) companies[idx] = company;
    else companies.push(company);
    write(COMPANIES_KEY, companies);
    return company;
  },

  deleteCompany(id: string): void {
    const companies = read<Company[]>(COMPANIES_KEY, []).filter((c) => c.id !== id);
    write(COMPANIES_KEY, companies);
    const analyses = read<Analysis[]>(ANALYSES_KEY, []).filter((a) => a.company_id !== id);
    write(ANALYSES_KEY, analyses);
  },

  listAnalyses(companyId?: string): Analysis[] {
    ensureSeeded();
    const all = read<Analysis[]>(ANALYSES_KEY, []);
    const filtered = companyId ? all.filter((a) => a.company_id === companyId) : all;
    return filtered.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  },

  getAnalysis(id: string): Analysis | null {
    ensureSeeded();
    return read<Analysis[]>(ANALYSES_KEY, []).find((a) => a.id === id) ?? null;
  },

  upsertAnalysis(analysis: Analysis): Analysis {
    ensureSeeded();
    const analyses = read<Analysis[]>(ANALYSES_KEY, []);
    const idx = analyses.findIndex((a) => a.id === analysis.id);
    if (idx >= 0) analyses[idx] = analysis;
    else analyses.push(analysis);
    write(ANALYSES_KEY, analyses);
    return analysis;
  },

  deleteAnalysis(id: string): void {
    const analyses = read<Analysis[]>(ANALYSES_KEY, []).filter((a) => a.id !== id);
    write(ANALYSES_KEY, analyses);
  },

  reset(): void {
    localStorage.removeItem(COMPANIES_KEY);
    localStorage.removeItem(ANALYSES_KEY);
    localStorage.removeItem(SEEDED_KEY);
  },
};

/** Gera um UUID v4 (usa crypto quando disponível). */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
