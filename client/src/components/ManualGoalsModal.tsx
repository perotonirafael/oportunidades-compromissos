import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import {
  GOAL_RUBRICAS,
  MONTH_KEYS,
  MONTH_LABELS,
  PRODUCT_FAMILIES,
  ManualGoal,
  GoalRubrica,
  MonthKey,
  ProductFamily,
} from '@/types/goals';
import { EtnRegistryItem } from '@/utils/etnRegistry';

interface ManualGoalsModalProps {
  isOpen: boolean;
  goals: ManualGoal[];
  etnRegistry: EtnRegistryItem[];
  onClose: () => void;
  onSave: (goals: ManualGoal[]) => Promise<void>;
}

type EditableGoal = ManualGoal & { error?: string; selectedEtnId: string };

const currentYear = new Date().getFullYear();

const createRow = (preset?: Partial<ManualGoal>): EditableGoal => ({
  id: preset?.id || crypto.randomUUID(),
  ano: preset?.ano || currentYear,
  etnNome: preset?.etnNome || '',
  idUsuarioErp: preset?.idUsuarioErp || '',
  produto: preset?.produto || 'HCM Senior',
  rubrica: preset?.rubrica || 'Setup + Licenças',
  mes: preset?.mes || 'janeiro',
  valor: preset?.valor || 0,
  selectedEtnId: preset?.idUsuarioErp || '',
});

function dedupeGoals(rows: EditableGoal[]): ManualGoal[] {
  const map = new Map<string, ManualGoal>();
  rows.forEach((row) => {
    const key = `${row.ano}-${row.idUsuarioErp}-${row.produto}-${row.rubrica}-${row.mes}`;
    map.set(key, {
      id: row.id,
      ano: row.ano,
      idUsuarioErp: row.idUsuarioErp,
      etnNome: row.etnNome,
      produto: row.produto,
      rubrica: row.rubrica,
      mes: row.mes,
      valor: row.valor,
    });
  });
  return Array.from(map.values());
}

export default function ManualGoalsModal({
  isOpen,
  goals,
  etnRegistry,
  onClose,
  onSave,
}: ManualGoalsModalProps) {
  const [rows, setRows] = useState<EditableGoal[]>([createRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const nextRows = goals.length ? goals.map((goal) => createRow(goal)) : [createRow()];
    setRows(nextRows);
  }, [goals, isOpen]);

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      const key = `${row.ano}-${row.idUsuarioErp}-${row.produto}-${row.rubrica}`;
      map.set(key, (map.get(key) || 0) + (row.valor || 0));
    });
    return map;
  }, [rows]);

  const hasRegistry = etnRegistry.length > 0;

  if (!isOpen) return null;

  const updateRow = <K extends keyof EditableGoal>(id: string, key: K, value: EditableGoal[K]) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, [key]: value, error: '' };
        if (key === 'selectedEtnId') {
          const selected = etnRegistry.find((item) => item.idUsuarioErp === value);
          if (selected) {
            next.idUsuarioErp = selected.idUsuarioErp;
            next.etnNome = selected.etnNome;
          }
        }
        return next;
      }),
    );
  };

  const validate = (): boolean => {
    let valid = true;
    setRows((current) =>
      current.map((row) => {
        let error = '';
        if (!row.selectedEtnId || !row.idUsuarioErp) {
          error = 'Selecione um ETN válido para preencher o Id Usuário ERP.';
          valid = false;
        }
        return { ...row, error };
      }),
    );
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(dedupeGoals(rows));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/40">
      <div className="h-full w-full bg-white p-6 overflow-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Lançamento Manual de Metas</h2>
          <button onClick={onClose} className="rounded-lg border px-3 py-2"><X size={16} /></button>
        </div>

        {!hasRegistry && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Para lançar metas, carregue primeiro Oportunidades + Compromissos para obter ETNs reais do sistema.
          </div>
        )}

        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setRows((current) => [...current, createRow()])}
            className="rounded-lg border px-3 py-2 text-sm flex items-center gap-1"
            disabled={!hasRegistry}
          >
            <Plus size={14} /> Adicionar linha
          </button>
        </div>

        <div className="overflow-auto border rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-2">Ano</th>
                <th className="p-2">ETN</th>
                <th className="p-2">Id Usuário ERP</th>
                <th className="p-2">Produto</th>
                <th className="p-2">Rubrica</th>
                <th className="p-2">Mês</th>
                <th className="p-2">Valor</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t align-top">
                  <td className="p-2">
                    <input
                      type="number"
                      className="w-24 border rounded p-1"
                      value={row.ano}
                      onChange={(e) => updateRow(row.id, 'ano', Number(e.target.value || currentYear))}
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-56 border rounded p-1"
                      value={row.selectedEtnId}
                      onChange={(e) => updateRow(row.id, 'selectedEtnId', e.target.value)}
                      disabled={!hasRegistry}
                    >
                      <option value="">Selecione</option>
                      {etnRegistry.map((item) => (
                        <option key={item.idUsuarioErp} value={item.idUsuarioErp}>
                          {item.etnNome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input className="w-36 border rounded p-1 bg-slate-50" value={row.idUsuarioErp} readOnly />
                  </td>
                  <td className="p-2">
                    <select
                      className="border rounded p-1"
                      value={row.produto}
                      onChange={(e) => updateRow(row.id, 'produto', e.target.value as Exclude<ProductFamily, 'Total Gestão'>)}
                    >
                      {PRODUCT_FAMILIES.map((produto) => <option key={produto} value={produto}>{produto}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className="border rounded p-1"
                      value={row.rubrica}
                      onChange={(e) => updateRow(row.id, 'rubrica', e.target.value as GoalRubrica)}
                    >
                      {GOAL_RUBRICAS.map((rubrica) => <option key={rubrica} value={rubrica}>{rubrica}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className="border rounded p-1"
                      value={row.mes}
                      onChange={(e) => updateRow(row.id, 'mes', e.target.value as MonthKey)}
                    >
                      {MONTH_KEYS.map((mes) => <option key={mes} value={mes}>{MONTH_LABELS[mes]}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-32 border rounded p-1"
                      value={row.valor}
                      onChange={(e) => updateRow(row.id, 'valor', Number(e.target.value || 0))}
                    />
                  </td>
                  <td className="p-2">
                    <button onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.some((row) => row.error) && (
          <div className="mt-2 text-sm text-red-600">
            {rows.find((row) => row.error)?.error}
          </div>
        )}

        <div className="mt-4 rounded-xl border p-3 text-sm">
          <h3 className="font-semibold mb-2">Totais anuais por combinação</h3>
          {Array.from(totals.entries()).map(([key, value]) => (
            <div key={key}>
              {key}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg border" onClick={onClose}>Cancelar</button>
          <button
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white flex items-center gap-1"
            onClick={handleSave}
            disabled={saving || !hasRegistry}
          >
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
