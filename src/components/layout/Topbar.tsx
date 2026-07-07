import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/formatting';
import { LogoutIcon } from '../ui/icons';
import { Badge } from '../ui/Badge';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { user, isDemo, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:px-6 no-print">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-2 text-ink-muted hover:bg-canvas lg:hidden"
          aria-label="Abrir menu"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        {isDemo && (
          <Badge variant="warning">Modo demonstração — dados fictícios</Badge>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-canvas"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-xs font-semibold text-white">
            {initials(user?.full_name)}
          </span>
          <span className="hidden sm:block">
            <span className="block text-sm font-medium text-ink">{user?.full_name ?? 'Usuário'}</span>
            <span className="block text-xs capitalize text-ink-muted">{user?.role ?? ''}</span>
          </span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-line bg-surface p-1.5 shadow-md">
              <div className="border-b border-line px-3 py-2">
                <p className="truncate text-sm font-medium text-ink">{user?.full_name}</p>
                <p className="truncate text-xs text-ink-muted">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-canvas"
              >
                <LogoutIcon className="h-4 w-4" />
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
