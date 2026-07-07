import { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { CopyIcon, WhatsAppIcon } from '../ui/icons';
import { useToast } from '../ui/Toast';
import { generateWhatsAppSummary } from '../../utils/whatsapp';
import type { Company } from '../../types/database';
import type { Diagnosis } from '../../types/diagnosis';

interface WhatsAppSummaryModalProps {
  open: boolean;
  onClose: () => void;
  diagnosis: Diagnosis;
  company: Company;
}

export function WhatsAppSummaryModal({ open, onClose, diagnosis, company }: WhatsAppSummaryModalProps) {
  const { notify } = useToast();
  const [contactName, setContactName] = useState('');

  const summary = useMemo(
    () => generateWhatsAppSummary(diagnosis, company, contactName),
    [diagnosis, company, contactName],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      notify('Resumo copiado para a área de transferência.', 'success');
    } catch {
      notify('Não foi possível copiar automaticamente. Selecione e copie o texto.', 'error');
    }
  }

  function openWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resumo para WhatsApp"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={copy}>
            <CopyIcon className="h-4 w-4" /> Copiar
          </button>
          <button className="btn-primary" onClick={openWhatsApp}>
            <WhatsAppIcon className="h-4 w-4" /> Abrir no WhatsApp
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="contact" className="label-base">Nome do contato (opcional)</label>
          <input
            id="contact"
            className="input-base"
            placeholder="Ex.: João"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </div>
        <div>
          <label className="label-base">Mensagem gerada</label>
          <textarea readOnly className="input-base min-h-[220px] text-sm" value={summary} />
          <p className="mt-1 text-xs text-ink-soft">
            Linguagem comercial e preliminar. Revise antes de enviar ao cliente.
          </p>
        </div>
      </div>
    </Modal>
  );
}
