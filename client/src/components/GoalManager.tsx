import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Save, Trash2, Target } from 'lucide-react';
import { toast } from 'sonner';

export interface ManualGoal {
  id: string;
  idUsuario: string;
  produto: string;
  rubrica: string;
  periodo: string;
  valor: number;
}

interface GoalManagerProps {
  onSaveGoals: (cleanGoals: ManualGoal[]) => void;
  existingGoals?: ManualGoal[];
}

const PRODUTOS_CRM = [
  "Gestão de Pessoas - HCM",
  "Gestão Empresarial - ERP",
  "Acesso e Segurança",
  "Ronda Senior",
  "SeniorX",
  "HCM Konviva",
  "HCM JobConvo"
];

const RUBRICAS = [
  "Setup + Licenças",
  "Serviços Não Recorrentes",
  "Recorrente"
];

const PERIODOS = [
  "Janeiro", "Fevereiro", "Março", "1º Trimestre",
  "Abril", "Maio", "Junho", "2º Trimestre",
  "Julho", "Agosto", "Setembro", "3º Trimestre",
  "Outubro", "Novembro", "Dezembro", "4º Trimestre",
  "Total Ano"
];

export function GoalManager({ onSaveGoals, existingGoals = [] }: GoalManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [goalsList, setGoalsList] = useState<ManualGoal[]>(existingGoals);

  // Estado do Formulário
  const [idUsuario, setIdUsuario] = useState('');
  const [produto, setProduto] = useState('');
  const [rubrica, setRubrica] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [valorStr, setValorStr] = useState('');

  const handleAddGoal = () => {
    if (!idUsuario || !produto || !rubrica || !periodo || !valorStr) {
      toast.error("Preencha todos os campos para adicionar a meta.");
      return;
    }

    const valorNumerico = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error("Digite um valor financeiro válido.");
      return;
    }

    const newGoal: ManualGoal = {
      id: `goal-${Date.now()}`,
      idUsuario: idUsuario.trim(),
      produto,
      rubrica,
      periodo,
      valor: valorNumerico
    };

    setGoalsList([newGoal, ...goalsList]);
    toast.success("Meta adicionada à lista!");

    // Limpa apenas o valor e período para facilitar lançamentos em massa do mesmo usuário/produto
    setValorStr('');
  };

  const handleRemoveGoal = (id: string) => {
    setGoalsList(goalsList.filter(g => g.id !== id));
  };

  const handleFinalSave = () => {
    onSaveGoals(goalsList);
    toast.success("Metas salvas e integradas ao Dashboard!");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          <Target className="h-4 w-4" /> Lançar Metas
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col bg-slate-50 p-0 rounded-xl overflow-hidden border-0">
        <DialogHeader className="px-6 py-4 border-b bg-white shrink-0 shadow-sm">
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            Lançamento Manual de Metas
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

          {/* PAINEL ESQUERDO: FORMULÁRIO */}
          <div className="w-full lg:w-1/3 bg-white border-r border-slate-200 p-6 flex flex-col gap-5 overflow-y-auto">
            <h3 className="font-semibold text-slate-700 border-b pb-2">Nova Meta</h3>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">ID Usuário ERP (ETN/Executivo)</label>
              <Input
                placeholder="Ex: 11124"
                value={idUsuario}
                onChange={e => setIdUsuario(e.target.value)}
                className="bg-slate-50 border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Produto CRM</label>
              <Select value={produto} onValueChange={setProduto}>
                <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {PRODUTOS_CRM.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Rubrica / Serviço</label>
              <Select value={rubrica} onValueChange={setRubrica}>
                <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue placeholder="Selecione a rubrica" /></SelectTrigger>
                <SelectContent>
                  {RUBRICAS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Período Referência</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue placeholder="Mês ou Trimestre" /></SelectTrigger>
                <SelectContent>
                  {PERIODOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Valor da Meta (R$)</label>
              <Input
                placeholder="Ex: 50000,00"
                value={valorStr}
                onChange={e => setValorStr(e.target.value)}
                className="bg-slate-50 border-slate-300 font-semibold text-indigo-700"
              />
            </div>

            <Button onClick={handleAddGoal} className="w-full bg-slate-800 hover:bg-slate-900 text-white mt-2 h-11">
              <PlusCircle className="h-4 w-4 mr-2" /> Adicionar à Lista
            </Button>
          </div>

          {/* PAINEL DIREITO: TABELA DE CONFERÊNCIA */}
          <div className="w-full lg:w-2/3 bg-slate-50 p-6 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-700">Metas Lançadas ({goalsList.length})</h3>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm overflow-auto">
              {goalsList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                  <Target className="h-12 w-12 mb-3 opacity-20" />
                  <p>Nenhuma meta lançada ainda.</p>
                  <p className="text-sm mt-1">Preencha o formulário ao lado para começar.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-semibold">ID ERP</th>
                      <th className="px-4 py-3 font-semibold">Produto / Rubrica</th>
                      <th className="px-4 py-3 font-semibold">Período</th>
                      <th className="px-4 py-3 font-semibold text-right">Valor (R$)</th>
                      <th className="px-4 py-3 text-center w-16">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {goalsList.map(goal => (
                      <tr key={goal.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">{goal.idUsuario}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{goal.produto}</div>
                          <div className="text-xs text-slate-500">{goal.rubrica}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold">
                            {goal.periodo}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700 text-right">
                          {goal.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveGoal(goal.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleFinalSave} disabled={goalsList.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-8 h-12 text-md shadow-md">
                <Save className="h-5 w-5 mr-2" /> Salvar Definitivamente e Atualizar Gráficos
              </Button>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
