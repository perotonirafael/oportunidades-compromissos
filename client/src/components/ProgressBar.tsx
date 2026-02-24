import { memo } from 'react';
import { Loader } from 'lucide-react';

interface Props {
  progress: number;
  currentFile: string;
  isVisible: boolean;
}

function ProgressBarInner({ progress, currentFile, isVisible }: Props) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md mx-4 glow-blue">
        <div className="flex items-center gap-3 mb-6">
          <Loader className="animate-spin text-primary" size={24} />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Processando dados</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{currentFile}</p>
          </div>
        </div>

        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center font-mono">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}

export const ProgressBar = memo(ProgressBarInner);
