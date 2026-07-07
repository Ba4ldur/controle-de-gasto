import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-4 text-center">
      <Logo />
      <div>
        <p className="font-mono text-5xl font-semibold text-brand-800">404</p>
        <p className="mt-2 text-lg font-medium text-ink">Página não encontrada</p>
        <p className="mt-1 text-sm text-ink-muted">O endereço acessado não existe ou foi movido.</p>
      </div>
      <button className="btn-primary" onClick={() => navigate('/dashboard')}>
        Voltar ao dashboard
      </button>
    </div>
  );
}
