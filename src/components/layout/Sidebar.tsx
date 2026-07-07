import { NavLink } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import {
  BuildingIcon,
  DashboardIcon,
  KnowledgeIcon,
  ReportIcon,
  SettingsIcon,
} from '../ui/icons';

interface NavItem {
  to: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/empresas', label: 'Empresas', icon: BuildingIcon },
  { to: '/analises', label: 'Análises', icon: ReportIcon },
  { to: '/base-conhecimento', label: 'Base de conhecimento', icon: KnowledgeIcon },
  { to: '/configuracoes', label: 'Configurações', icon: SettingsIcon },
];

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-brand-950/40 lg:hidden no-print"
          onClick={onNavigate}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-brand-800/40 bg-brand-950 transition-transform duration-200 lg:translate-x-0 no-print ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <Logo variant="light" />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-800 text-white'
                      : 'text-brand-100/80 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[0.7rem] leading-relaxed text-brand-100/60">
            Diagnóstico preliminar da Reforma Tributária do Consumo. Uso profissional.
          </p>
        </div>
      </aside>
    </>
  );
}
