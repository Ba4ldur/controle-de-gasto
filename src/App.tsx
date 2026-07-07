import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { LoadingState } from './components/ui/states';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanyFormPage } from './pages/CompanyFormPage';
import { CompanyDetailPage } from './pages/CompanyDetailPage';
import { AnalysesPage } from './pages/AnalysesPage';
import { AnalysisNewPage } from './pages/AnalysisNewPage';
import { AnalysisDetailPage } from './pages/AnalysisDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { NotFoundPage } from './pages/NotFoundPage';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingState label="Carregando sessão…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? undefined : user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/empresas" element={<CompaniesPage />} />
        <Route path="/empresas/nova" element={<CompanyFormPage />} />
        <Route path="/empresas/:id/editar" element={<CompanyFormPage />} />
        <Route path="/empresas/:id" element={<CompanyDetailPage />} />
        <Route path="/analises" element={<AnalysesPage />} />
        <Route path="/analises/nova" element={<AnalysisNewPage />} />
        <Route path="/analises/:id" element={<AnalysisDetailPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/base-conhecimento" element={<KnowledgeBasePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
