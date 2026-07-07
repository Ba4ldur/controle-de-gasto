import { useRef, useState, type DragEvent } from 'react';
import { UploadIcon, FileIcon, SpinnerIcon } from '../ui/icons';
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB, validateUploadFile } from '../../utils/validation';

interface UploadBoxProps {
  onFile: (file: File) => void;
  busy?: boolean;
  currentFileName?: string | null;
  disabled?: boolean;
}

export function UploadBox({ onFile, busy, currentFileName, disabled }: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  function handleFiles(files: FileList | null) {
    setError('');
    const file = files?.[0];
    if (!file) return;
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      setError(validation.error ?? 'Arquivo inválido.');
      return;
    }
    onFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || busy) return;
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !busy) inputRef.current?.click();
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? 'border-brand-600 bg-brand-50' : 'border-line bg-canvas/50 hover:border-brand-400'
        } ${disabled || busy ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        {busy ? (
          <SpinnerIcon className="h-7 w-7 text-brand-700" />
        ) : currentFileName ? (
          <FileIcon className="h-7 w-7 text-brand-700" />
        ) : (
          <UploadIcon className="h-7 w-7 text-ink-soft" />
        )}
        <p className="text-sm font-medium text-ink">
          {busy ? 'Processando arquivo…' : currentFileName ? currentFileName : 'Arraste um arquivo ou clique para selecionar'}
        </p>
        <p className="text-xs text-ink-soft">
          Formatos: {ALLOWED_FILE_EXTENSIONS.map((e) => e.toUpperCase()).join(', ')} · até {MAX_FILE_SIZE_MB} MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled || busy}
        />
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
