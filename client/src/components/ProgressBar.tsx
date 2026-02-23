import { Loader } from 'lucide-react';

interface ProgressBarProps {
  progress: number; // 0-100
  currentFile: string;
  isProcessing: boolean;
}

export function ProgressBar({ progress, currentFile, isProcessing }: ProgressBarProps) {
  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Loader className="animate-spin text-blue-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Processando arquivo</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4 truncate">
          {currentFile}
        </p>

        {/* Barra de progresso */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Percentual */}
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-gray-700">
            {progress}%
          </p>
          <p className="text-xs text-gray-500">
            {progress === 100 ? 'Concluído' : 'Processando...'}
          </p>
        </div>

        {/* Dica */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Não feche esta janela durante o processamento
        </p>
      </div>
    </div>
  );
}
