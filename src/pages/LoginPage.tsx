import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/ui/Logo';
import { InlineAlert } from '../components/ui/states';
import { SpinnerIcon } from '../components/ui/icons';
import { isDemo } from '../lib/config';
import { isValidEmail } from '../utils/validation';

type Mode = 'login' | 'signup' | 'reset';

export function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState(isDemo ? 'demonstracao@attivare.local' : '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!isDemo && !isValidEmail(email)) {
      setError('Informe um e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        navigate('/dashboard');
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          setError('Informe seu nome completo.');
          return;
        }
        await signUp(email, password, fullName);
        if (isDemo) {
          navigate('/dashboard');
        } else {
          setInfo('Cadastro realizado. Verifique seu e-mail para confirmar a conta.');
          setMode('login');
        }
      } else {
        await resetPassword(email);
        setInfo('Se o e-mail existir, enviaremos instruções de recuperação.');
        setMode('login');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Painel de marca */}
      <div className="hidden w-1/2 flex-col justify-between bg-brand-950 p-12 lg:flex">
        <Logo variant="light" />
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Diagnóstico preliminar da Reforma Tributária do Consumo
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-brand-100/80">
            Gere análises consultivas a partir do cartão CNPJ da empresa, com revisão
            profissional do contador e relatório executivo pronto para o cliente.
          </p>
          <div className="mt-8 h-0.5 w-16 bg-gold" />
          <p className="mt-4 text-xs uppercase tracking-widest text-gold/80">
            Attivare Contabilidade
          </p>
        </div>
        <p className="text-xs text-brand-100/50">
          Análise preliminar. Não substitui estudo tributário quantitativo.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex w-full flex-col items-center justify-center bg-canvas px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-2xl font-semibold text-ink">
            {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Recuperar senha'}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {mode === 'login'
              ? 'Acesse o painel Attivare Reforma Intelligence.'
              : mode === 'signup'
                ? 'Cadastre-se para usar a plataforma.'
                : 'Informe seu e-mail para redefinir a senha.'}
          </p>

          {isDemo && (
            <div className="mt-4">
              <InlineAlert variant="info">
                Modo demonstração ativo. Qualquer e-mail e senha entram, usando dados fictícios.
              </InlineAlert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="label-base">Nome completo</label>
                <input
                  id="fullName"
                  type="text"
                  className="input-base"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="label-base">E-mail</label>
              <input
                id="email"
                type="email"
                className="input-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="label-base">Senha</label>
                <input
                  id="password"
                  type="password"
                  className="input-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </div>
            )}

            {error && <InlineAlert variant="danger">{error}</InlineAlert>}
            {info && <InlineAlert variant="positive">{info}</InlineAlert>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading && <SpinnerIcon className="h-4 w-4" />}
              {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar instruções'}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-sm">
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => setMode('reset')} className="text-brand-700 hover:underline">
                  Esqueci minha senha
                </button>
                <p className="text-ink-muted">
                  Não tem conta?{' '}
                  <button type="button" onClick={() => setMode('signup')} className="font-medium text-brand-700 hover:underline">
                    Cadastre-se
                  </button>
                </p>
              </>
            )}
            {mode !== 'login' && (
              <button type="button" onClick={() => setMode('login')} className="text-brand-700 hover:underline">
                Voltar para o login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
