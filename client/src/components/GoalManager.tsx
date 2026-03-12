import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Save, Edit2, Check } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

interface GoalRow {
  id: string;
  produto: string;
  idUsuario: string;
  rubrica: string;
  marco: number;
  tri1: number;
}

interface GoalManagerProps {
  onSaveGoals: (cleanGoals: any[]) => void;
}

export function GoalManager({ onSaveGoals }: GoalManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<GoalRow>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.xlsx')) {
      toast.error('Formato inválido! Abra o Excel, clique em "Salvar Como -> CSV (separado por vírgulas)" e suba o novo arquivo.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedData: GoalRow[] = (results.data as any[]).map((row: any, index: number) => {
            const findKey = (searchStr: string) => Object.keys(row).find((k) => k.toLowerCase().replace(/\s/g, '').includes(searchStr));

            const prodKey = findKey('produto');
            const userKey = findKey('usuário') || findKey('usuario') || findKey('iderp');
            const rubricaKey = findKey('rubrica');
            const marcoKey = findKey('março') || findKey('marco');
            const triKey = findKey('1ºtri') || findKey('1otri');

            const parseMoney = (val: any) => {
              if (!val) return 0;
              let str = String(val).trim();
              if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
              const num = parseFloat(str);
              return Number.isNaN(num) ? 0 : num;
            };

            return {
              id: `goal-${index}-${Date.now()}`,
              produto: row[prodKey || 'Produto'] || '',
              idUsuario: String(row[userKey || 'Id Usuário ERP']).replace('.0', ''),
              rubrica: row[rubricaKey || 'Rubrica'] || '',
              marco: parseMoney(row[marcoKey || 'Março']),
              tri1: parseMoney(row[triKey || '1ºTri']),
            };
          }).filter((g) => g.produto && g.idUsuario && g.idUsuario !== 'undefined');

          if (parsedData.length === 0) {
            toast.error('Nenhuma meta encontrada. Verifique o CSV.');
            return;
          }

          setGoals(parsedData);
          toast.success(`${parsedData.length} metas importadas com sucesso!`);
        } catch (error) {
          toast.error('Erro ao processar o CSV.');
        }
      }
    });
  };

  const handleEdit = (goal: GoalRow) => {
    setEditingId(goal.id);
    setEditForm(goal);
  };

  const handleSaveEdit = () => {
    setGoals(goals.map((g) => g.id === editingId ? { ...g, ...editForm } as GoalRow : g));
    setEditingId(null);
  };

  const handleFinalSave = () => {
    const finalGoals = goals.map((g) => ({
      'Produto': g.produto,
      'Id Usuário ERP': g.idUsuario,
      'Rubrica': g.rubrica,
      'Março': g.marco,
      '1º Trimestre': g.tri1,
      'Total Ano': g.tri1 * 4
    }));

    onSaveGoals(finalGoals);
    toast.success('Metas sincronizadas!');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md">
          <Upload className="h-4 w-4" /> Importar e Validar Metas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col bg-white rounded-xl">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-bold text-gray-800">Gestor Interativo de Metas</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="mb-6 p-6 border-2 border-dashed border-blue-300 rounded-xl text-center bg-blue-50 hover:bg-blue-100 transition-colors">
             <label className="cursor-pointer flex flex-col items-center justify-center h-full">
               <Upload className="h-10 w-10 text-blue-500 mb-3" />
               <span className="text-base text-blue-700 font-semibold">Clique para subir o Metas.csv</span>
               <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
             </label>
          </div>

          {goals.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-4 font-bold text-gray-900">Usuário ID</th>
                        <th className="px-5 py-4 font-bold text-gray-900">Produto</th>
                        <th className="px-5 py-4 font-bold text-gray-900">Rubrica</th>
                        <th className="px-5 py-4 font-bold text-gray-900 bg-blue-50/50">Meta Março (R$)</th>
                        <th className="px-5 py-4 font-bold text-gray-900 bg-blue-50/50">Meta 1º Tri (R$)</th>
                        <th className="px-5 py-4 font-bold text-gray-900 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {goals.map((goal, idx) => (
                        <tr key={goal.id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="px-5 py-3 font-semibold text-gray-800">{goal.idUsuario}</td>
                          <td className="px-5 py-3">{goal.produto}</td>
                          <td className="px-5 py-3"><span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium">{goal.rubrica}</span></td>
                          <td className="px-5 py-3 bg-blue-50/20">
                            {editingId === goal.id ? (
                              <Input type="number" value={editForm.marco ?? ''} onChange={(e) => setEditForm({...editForm, marco: Number(e.target.value)})} className="w-28 h-9" />
                            ) : (<span className="font-medium text-gray-700">{goal.marco.toLocaleString('pt-BR')}</span>)}
                          </td>
                          <td className="px-5 py-3 bg-blue-50/20">
                            {editingId === goal.id ? (
                              <Input type="number" value={editForm.tri1 ?? ''} onChange={(e) => setEditForm({...editForm, tri1: Number(e.target.value)})} className="w-28 h-9" />
                            ) : (<span className="font-medium text-gray-700">{goal.tri1.toLocaleString('pt-BR')}</span>)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {editingId === goal.id ? (
                              <Button size="sm" onClick={handleSaveEdit} className="bg-green-500 hover:bg-green-600 text-white w-full"><Check className="h-4 w-4 mr-1"/> Salvar</Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => handleEdit(goal)} className="w-full"><Edit2 className="h-4 w-4 mr-1"/> Editar</Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {goals.length > 0 && (
          <div className="p-4 border-t bg-white flex justify-end">
            <Button onClick={handleFinalSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-md">
              <Save className="h-5 w-5 mr-2" /> Injetar Metas no Gráfico
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
