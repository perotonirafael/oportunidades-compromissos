import React from 'react';
import { GoalRow, MONTH_KEYS, MONTH_LABELS, MonthKey } from '@/types/goals';

interface GoalEntryPanelProps {
  goals: GoalRow[];
  onUpdateGoalValue: (goalId: string, month: MonthKey, value: number) => void;
}

function formatCurrencyInput(value: number) {
  return Number.isFinite(value) ? String(value) : '0';
}

export default function GoalEntryPanel({
  goals,
  onUpdateGoalValue,
}: GoalEntryPanelProps) {
  if (!goals.length) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        Nenhuma meta carregada. Faça upload do CSV de metas para visualizar e editar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <div key={goal.id} className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{goal.etnNome}</div>
              <div className="text-sm text-muted-foreground">
                ID ERP: {goal.idUsuarioErp} • Ano: {goal.ano}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {MONTH_KEYS.map((month) => (
              <label key={month} className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {MONTH_LABELS[month]}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={formatCurrencyInput(goal[month])}
                  onChange={(e) =>
                    onUpdateGoalValue(goal.id, month, Number(e.target.value || 0))
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
