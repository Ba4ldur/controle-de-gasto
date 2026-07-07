/**
 * Extração de texto de arquivos no navegador.
 *
 * - PDF pesquisável: extrai texto com PDF.js.
 * - PDF sem camada de texto (scaneado/imagem): retorna aviso — a leitura
 *   automática é limitada e o usuário deve conferir/informar os dados (ou,
 *   se configurada, a Edge Function multimodal pode ser usada).
 * - TXT: leitura direta.
 * - Imagens: não há OCR local; retorna aviso orientando conferência manual.
 */

import * as pdfjsLib from 'pdfjs-dist';
// O worker é resolvido pelo Vite como URL do bundle.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export interface ExtractTextResult {
  text: string;
  status: 'sucesso' | 'parcial' | 'sem_texto' | 'nao_suportado' | 'erro';
  message?: string;
}

/** Extrai texto de um PDF pesquisável. */
export async function extractTextFromPDF(file: File | ArrayBuffer): Promise<ExtractTextResult> {
  try {
    const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const parts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
      if (pageText) parts.push(pageText);
    }

    const text = parts.join('\n\n').trim();

    if (!text) {
      return {
        text: '',
        status: 'sem_texto',
        message:
          'O PDF não contém texto pesquisável (provavelmente é uma imagem/scaneado). A leitura automática é limitada — confira e informe os dados manualmente.',
      };
    }

    return { text, status: 'sucesso' };
  } catch (error) {
    return {
      text: '',
      status: 'erro',
      message: `Falha ao ler o PDF: ${(error as Error).message}`,
    };
  }
}

/** Lê arquivo de texto simples. */
export async function extractTextFromTxt(file: File): Promise<ExtractTextResult> {
  try {
    const text = await file.text();
    return { text: text.trim(), status: text.trim() ? 'sucesso' : 'sem_texto' };
  } catch (error) {
    return { text: '', status: 'erro', message: (error as Error).message };
  }
}

/** Ponto único de extração conforme o tipo do arquivo. */
export async function extractTextFromFile(file: File): Promise<ExtractTextResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf' || file.type === 'application/pdf') {
    return extractTextFromPDF(file);
  }
  if (ext === 'txt' || file.type === 'text/plain') {
    return extractTextFromTxt(file);
  }
  if (['png', 'jpg', 'jpeg'].includes(ext) || file.type.startsWith('image/')) {
    return {
      text: '',
      status: 'nao_suportado',
      message:
        'Imagens não têm leitura automática de texto neste ambiente. Cole o conteúdo do cartão CNPJ ou confira os campos manualmente. (A extração por IA multimodal pode ser habilitada na Edge Function.)',
    };
  }
  return {
    text: '',
    status: 'nao_suportado',
    message: 'Tipo de arquivo não suportado para extração de texto.',
  };
}
