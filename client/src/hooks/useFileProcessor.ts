import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

export interface FileProcessingState {
  isProcessing: boolean;
  progress: number; // 0-100
  currentFile: string;
  error: string | null;
}

export interface ProcessedFileData {
  opportunities: any[];
  actions: any[];
}

const CHUNK_SIZE = 5000; // Processar 5000 linhas por chunk
const MAX_RECORDS = 50000; // Limite total

export function useFileProcessor() {
  const [state, setState] = useState<FileProcessingState>({
    isProcessing: false,
    progress: 0,
    currentFile: '',
    error: null
  });

  const processFileInChunks = useCallback(async (file: File): Promise<any[]> => {
    return new Promise(async (resolve, reject) => {
      try {
        setState(prev => ({
          ...prev,
          isProcessing: true,
          currentFile: file.name,
          error: null
        }));

        // Liberar event loop
        await new Promise(r => setTimeout(r, 50));

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const allData: any[] = [];

        for (const sheetName of workbook.SheetNames) {
          if (allData.length >= MAX_RECORDS) break;

          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (data.length === 0) continue;

          // Processar em chunks para não travar
          for (let i = 0; i < data.length && allData.length < MAX_RECORDS; i += CHUNK_SIZE) {
            // Liberar event loop a cada chunk
            await new Promise(r => setTimeout(r, 10));

            const chunk = data.slice(i, Math.min(i + CHUNK_SIZE, MAX_RECORDS - allData.length));
            allData.push(...chunk);

            // Atualizar progresso
            const progress = Math.min(100, Math.round((allData.length / MAX_RECORDS) * 100));
            setState(prev => ({
              ...prev,
              progress
            }));
          }
        }

        setState(prev => ({
          ...prev,
          progress: 100,
          isProcessing: false
        }));

        resolve(allData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: errorMessage
        }));
        reject(err);
      }
    });
  }, []);

  const processFiles = useCallback(
    async (oppFile: File | null, actFile: File | null): Promise<ProcessedFileData | null> => {
      try {
        const opportunities: any[] = [];
        const actions: any[] = [];

        if (oppFile) {
          const data = await processFileInChunks(oppFile);
          opportunities.push(...data);
        }

        if (actFile) {
          const data = await processFileInChunks(actFile);
          actions.push(...data);
        }

        if (opportunities.length === 0 && actions.length === 0) {
          throw new Error('Nenhum dado válido encontrado nos arquivos.');
        }

        return { opportunities, actions };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao processar arquivos';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isProcessing: false
        }));
        return null;
      }
    },
    [processFileInChunks]
  );

  const resetState = useCallback(() => {
    setState({
      isProcessing: false,
      progress: 0,
      currentFile: '',
      error: null
    });
  }, []);

  return {
    state,
    processFiles,
    resetState
  };
}
