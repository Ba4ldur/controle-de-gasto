import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { InlineAlert } from '../components/ui/states';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { isDemo, hasSupabaseConfig } from '../lib/config';
import { demoStore } from '../services/demoStore';

export function SettingsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  function resetDemo() {
    demoStore.reset();
    notify('Dados de demonstração redefinidos. Recarregando…', 'success');
    setConfirmReset(false);
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <div>
      <PageHeader title="Configurações" description="Informações da conta e do ambiente." />

      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Conta</h2>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">Nome</dt>
              <dd className="mt-0.5 text-sm text-ink">{user?.full_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">E-mail</dt>
              <dd className="mt-0.5 text-sm text-ink">{user?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">Perfil</dt>
              <dd className="mt-0.5 text-sm capitalize text-ink">{user?.role ?? '—'}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-ink-soft">
            Perfis previstos: administrador, contador, analista e cliente. A gestão de perfis e
            permissões por usuário está <span className="font-medium">em desenvolvimento</span>.
          </p>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Ambiente</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Conexão Supabase</span>
              {hasSupabaseConfig ? (
                <Badge variant="positive">Configurada</Badge>
              ) : (
                <Badge variant="warning">Não configurada</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Modo de operação</span>
              {isDemo ? (
                <Badge variant="warning">Demonstração (dados fictícios)</Badge>
              ) : (
                <Badge variant="positive">Produção</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Geração de diagnóstico</span>
              {isDemo ? (
                <Badge variant="neutral">Exemplo local</Badge>
              ) : (
                <Badge variant="info">Edge Function + OpenAI</Badge>
              )}
            </div>
          </div>
          {!hasSupabaseConfig && (
            <div className="mt-4">
              <InlineAlert variant="info">
                Defina <code className="font-mono text-xs">VITE_SUPABASE_URL</code> e{' '}
                <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> no arquivo{' '}
                <code className="font-mono text-xs">.env</code> para conectar ao banco e ativar a IA.
                A chave da OpenAI vive apenas na Edge Function, nunca no frontend.
              </InlineAlert>
            </div>
          )}
        </section>

        {isDemo && (
          <section className="card p-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">Dados de demonstração</h2>
            <p className="mb-4 text-sm text-ink-muted">
              Restaure as empresas e análises fictícias ao estado inicial. Isso remove tudo que foi
              criado no modo demonstração neste navegador.
            </p>
            <button className="btn-secondary" onClick={() => setConfirmReset(true)}>
              Redefinir dados de demonstração
            </button>
          </section>
        )}
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Redefinir dados de demonstração"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmReset(false)}>Cancelar</button>
            <button className="btn-danger" onClick={resetDemo}>Redefinir</button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Todas as empresas e análises criadas no modo demonstração serão removidas e os exemplos
          fictícios serão restaurados. Deseja continuar?
        </p>
      </Modal>
    </div>
  );
}
