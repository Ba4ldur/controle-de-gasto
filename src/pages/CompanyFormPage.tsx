import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { CompanyForm } from '../components/company/CompanyForm';
import { LoadingState, ErrorState } from '../components/ui/states';
import { useToast } from '../components/ui/Toast';
import { useAsync } from '../hooks/useAsync';
import { companyService, type CompanyFormValues } from '../services/companyService';

export function CompanyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);

  const { data: company, loading, error } = useAsync(
    async () => (id ? companyService.get(id) : null),
    [id],
  );

  async function handleSubmit(values: CompanyFormValues) {
    setSaving(true);
    try {
      if (isEdit && id) {
        await companyService.update(id, values);
        notify('Empresa atualizada.', 'success');
        navigate(`/empresas/${id}`);
      } else {
        const created = await companyService.create(values);
        notify('Empresa cadastrada.', 'success');
        navigate(`/empresas/${created.id}`);
      }
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && loading) return <LoadingState />;
  if (isEdit && error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Editar empresa' : 'Nova empresa'}
        description="Preencha os dados cadastrais. Você pode informar apenas o essencial e completar depois."
        breadcrumbs={[{ label: 'Empresas' }, { label: isEdit ? 'Editar' : 'Nova' }]}
      />
      <CompanyForm
        initial={company ?? undefined}
        submitLabel={isEdit ? 'Salvar alterações' : 'Cadastrar empresa'}
        saving={saving}
        onSubmit={handleSubmit}
        onCancel={() => navigate(isEdit && id ? `/empresas/${id}` : '/empresas')}
      />
    </div>
  );
}
