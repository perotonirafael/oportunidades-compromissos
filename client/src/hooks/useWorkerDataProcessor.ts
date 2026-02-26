import { useEffect, useRef, useState } from 'react';

export interface WorkerResult {
  records: any[];
  missingAgendas: any[];
  filterOptions: any;
  kpis: any;
  motivosPerda: any[];
  funnelData: any[];
  forecastFunnel: any[];
  etnTop10: any[];
}

export function useWorkerDataProcessor() {
  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Inicializar worker
    workerRef.current = new Worker(
      new URL('../workers/dataProcessor.worker.ts', import.meta.url),
      { type: 'module' }
    );

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const processData = (
    opportunities: any[],
    actions: any[]
  ): Promise<WorkerResult> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker não inicializado'));
        return;
      }

      setIsProcessing(true);
      setError(null);

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'result') {
          setIsProcessing(false);
          workerRef.current?.removeEventListener('message', handleMessage);
          workerRef.current?.removeEventListener('error', handleError);
          resolve(event.data);
        }
      };

      const handleError = (event: ErrorEvent) => {
        setIsProcessing(false);
        setError(event.message);
        workerRef.current?.removeEventListener('message', handleMessage);
        workerRef.current?.removeEventListener('error', handleError);
        reject(new Error(event.message));
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.addEventListener('error', handleError);

      workerRef.current.postMessage({
        type: 'process',
        opportunities,
        actions,
      });
    });
  };

  return { processData, isProcessing, error };
}
