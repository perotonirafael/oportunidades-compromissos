import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Save, Edit2, Check, Calculator } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

type PeriodKey = 'jan'|'fev'|'mar'|'tri1'|'abr'|'mai'|'jun'|'tri2'|'jul'|'ago'|'set'|'tri3'|'out'|'nov'|'dez'|'tri4'|'total';

interface GoalRow {
  id: string;
  produto: string;
  idUsuario: string;
  rubrica: string;
  jan: number; fev: number; mar: number; tri1: number;
  abr: number; mai: number; jun: number; tri2: number;
  jul: number; ago: number; set: number; tri3: number;
  out: number; nov: number; dez: number; tri4: number;
  total: number;
}

interface GoalManagerProps {
  onSaveGoals: (cleanGoals: any[]) => void;
}

const periods: { key: PeriodKey, label: string, isQuarter?: boolean, isTotal?: boolean, readOnly?: boolean }[] = [
  { key: 'jan', label: 'Jan' }, { key: 'fev', label: 'Fev' }, { key: 'mar', label: 'Mar' }, 
  { key: 'tri1', label: '1º Tri', isQuarter: true, readOnly: true },
  { key: 'abr', label: 'Abr' }, { key: 'mai', label: 'Mai' }, { key: 'jun', label: 'Jun' }, 
  { key: 'tri2', label: '2º Tri', isQuarter: true, readOnly: true },
  { key: 'jul', label: 'Jul' }, { key: 'ago', label: 'Ago' }, { key: 'set', label: 'Set' }, 
  { key: 'tri3', label: '3º Tri', isQuarter: true, readOnly: true },
  { key: 'out', label: 'Out' }, { key: 'nov', label: 'Nov' }, { key: 'dez', label: 'Dez' }, 
  { key: 'tri4', label: '4º Tri', isQuarter: true, readOnly: true },
  { key: 'total', label: 'Total Ano', isTotal: true, readOnly: true }
];

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

    // AQUI ESTAVA O SEGREDO: Forçar explicitamente o delimitador como ';' 
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";", // <--- Correção que evita colunas espremidas
      complete: (results) => {
        try {
          const parsedData: GoalRow[] = (results.data as any[]).map((row: any, index: number) => {
            const findKey = (searchStr: string) => Object.keys(row).find(k => k.toLowerCase().replace(/\s/g,'').includes(searchStr));
            
            const prodKey = findKey('produto');
            const userKey = findKey('usuário') || findKey('usuario') || findKey('iderp');
            const rubricaKey = findKey('rubrica');

            // Parser monetário à prova de falhas: Limpa R$, espaços e converte pontuação
            const parseMoney = (val: any) => {
              if (!val) return 0;
              let str = String(val).trim();
              if (str === '-' || str === '') return 0;
              str = str.replace(/R\$\s?/g, '').trim(); 
              if (str.includes(',')) {
                str = str.replace(/\./g, '').replace(',', '.');
              }
              const num = parseFloat(str);
              return isNaN(num) ? 0 : num;
            };

            const jan = parseMoney(row[findKey('janeiro') || 'Janeiro']);
            const fev = parseMoney(row[findKey('fevereiro') || 'Fevereiro']);
            const mar = parseMoney(row[findKey('março') || findKey('marco') || 'Março']);
            const abr = parseMoney(row[findKey('abril') || 'Abril']);
            const mai = parseMoney(row[findKey('maio') || 'Maio']);
            const jun = parseMoney(row[findKey('junho') || 'Junho']);
            const jul = parseMoney(row[findKey('julho') || 'Julho']);
            const ago = parseMoney(row[findKey('agosto') || 'Agosto']);
            const set = parseMoney(row[findKey('setembro') || 'Setembro']);
            const out = parseMoney(row[findKey('outubro') || 'Outubro']);
            const nov = parseMoney(row[findKey('novembro') || 'Novembro']);
            const dez = parseMoney(row[findKey('dezembro') || 'Dezembro']);

            const tri1 = jan + fev + mar;
            const tri2 = abr + mai + jun;
            const tri3 = jul + ago + set;
            const tri4 = out + nov + dez;
            const total = tri1 + tri2 + tri3 + tri4;

            return {
              id: `goal-${index}-${Date.now()}`,
              produto: row[prodKey || 'Produto'] || '',
              idUsuario: String(row[userKey || 'Id Usuário ERP']).replace('.0', ''),
              rubrica: row[rubricaKey || 'Rubrica'] || '',
              jan, fev, mar, tri1,
              abr, mai, jun, tri2,
              jul, ago, set, tri3,
              out, nov, dez, tri4,
              total
            };
          }).filter(g => g.produto && g.idUsuario && g.idUsuario !== "undefined");

          if (parsedData.length === 0) {
            toast.error("Erro: Colunas não encontradas. O arquivo está vazio ou fora do formato esperado.");
            return;
          }

          setGoals(parsedData);
          toast.success(`${parsedData.length} metas do ano todo importadas e calculadas!`);
        } catch (error) {
          toast.error("Erro ao processar o arquivo CSV.");
        }
      }
    });
  };

  const handleEdit = (goal: GoalRow) => {
    setEditingId(goal.id);
    setEditForm(goal);
  };

  const handleFieldChange = (field: PeriodKey, value: number) => {
    setEditForm(prev => {
      const next = { ...prev, [field]: value } as Partial<GoalRow>;
      
      if (['jan', 'fev', 'mar'].includes(field)) {
        next.tri1 = (next.jan ?? prev.jan ?? 0) + (next.fev ?? prev.fev ?? 0) + (next.mar ?? prev.mar ?? 0);
      }
      if (['abr', 'mai', 'jun'].includes(field)) {
        next.tri2 = (next.abr ?? prev.abr ?? 0) + (next.mai ?? prev.mai ?? 0) + (next.jun ?? prev.jun ?? 0);
      }
      if (['jul', 'ago', 'set'].includes(field)) {
        next.tri3 = (next.jul ?? prev.jul ?? 0) + (next.ago ?? prev.ago ?? 0) + (next.set ?? prev.set ?? 0);
      }
      if (['out', 'nov', 'dez'].includes(field)) {
        next.tri4 = (next.out ?? prev.out ?? 0) + (next.nov ?? prev.nov ?? 0) + (next.dez ?? prev.dez ?? 0);
      }

      next.total = (next.tri1 ?? prev.tri1 ?? 0) + (next.tri2 ?? prev.tri2 ?? 0) + 
                   (next.tri3 ?? prev.tri3 ?? 0) + (next.tri4 ?? prev.tri4 ?? 0);
                   
      return next;
    });
  };

  const handleSaveEdit = () => {
    setGoals(goals.map(g => g.id === editingId ? { ...g, ...editForm } as GoalRow : g));
    setEditingId(null);
  };

  const handleFinalSave = () => {
    const finalGoals = goals.map(g => ({
      "Produto": g.produto,
      "Id Usuário ERP": g.idUsuario,
      "Rubrica": g.rubrica,
      "Janeiro": g.jan, "Fevereiro": g.fev, "Março": g.mar, "1º Trimestre": g.tri1,
      "Abril": g.abr, "Maio": g.mai, "Junho": g.jun, "2º Trimestre": g.tri2,
      "Julho": g.jul, "Agosto": g.ago, "Setembro": g.set, "3º Trimestre": g.tri3,
      "Outubro": g.out, "Novembro": g.nov, "Dezembro": g.dez, "4º Trimestre": g.tri4,
      "Total Ano": g.total 
    }));
    
    onSaveGoals(finalGoals);
    toast.success("Metas guardadas e injetadas no Dashboard com sucesso!");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md">
          <Upload className="h-4 w-4" /> Importar e Validar Metas
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] overflow-hidden flex flex-col bg-slate-50 rounded-xl p-0">
        <DialogHeader className="px-6 py-4 border-b bg-white shrink-0">
          <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Gestor Anual de Metas Inteligente
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          <div className="mb-4 p-4 border-2 border-dashed border-blue-300 rounded-xl text-center bg-blue-50 hover:bg-blue-100 transition-colors shrink-0">
             <label className="cursor-pointer flex flex-col items-center justify-center">
               <Upload className="h-8 w-8 text-blue-500 mb-2" />
               <span className="text-sm text-blue-700 font-semibold">Subir novo arquivo Metas_2025.csv</span>
               <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
             </label>
          </div>

          {goals.length > 0 && (
            <div className="flex-1 border border-gray-300 shadow-sm overflow-auto bg-white rounded-xl relative">
              <table className="w-max text-sm text-left text-gray-600 border-collapse min-w-full">
                <thead className="text-xs text-gray-700 uppercase sticky top-0 z-30">
                  <tr>
                    <th className="px-4 py-3 font-bold bg-slate-200 sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b border-gray-300">
                      Usuário / Produto / Rubrica
                    </th>
                    {periods.map(p => (
                      <th key={p.key} className={`px-4 py-3 font-bold min-w-[110px] border-l border-b border-gray-300 ${p.isQuarter ? 'bg-blue-100 text-blue-900' : p.isTotal ? 'bg-green-100 text-green-900' : 'bg-slate-100'}`}>
                        {p.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-bold bg-slate-200 sticky right-0 z-40 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b border-gray-300 text-center">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {goals.map((goal, idx) => (
                    <tr key={goal.id} className={`hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      
                      <td className="px-4 py-3 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-inherit border-r border-gray-200">
                        <div className="text-xs font-bold text-gray-400 mb-1">ID: {goal.idUsuario}</div>
                        <div className="font-semibold text-gray-800 truncate max-w-[220px]" title={goal.produto}>{goal.produto}</div>
                        <div className="text-xs font-medium text-slate-500 truncate max-w-[220px]" title={goal.rubrica}>{goal.rubrica}</div>
                      </td>
                      
                      {periods.map(p => (
                        <td key={p.key} className={`px-4 py-2 border-l border-gray-200 ${p.isQuarter ? 'bg-blue-50/40' : p.isTotal ? 'bg-green-50/40' : ''}`}>
                          {editingId === goal.id && !p.readOnly ? (
                            <Input 
                              type="number" 
                              value={editForm[p.key] ?? ''} 
                              onChange={(e) => handleFieldChange(p.key, Number(e.target.value))}
                              className="w-24 h-8 text-sm px-2 font-medium text-blue-700 border-blue-400 focus-visible:ring-blue-500"
                            />
                          ) : (
                            <span className={`text-sm tracking-tight ${p.isQuarter ? 'font-bold text-blue-700' : p.isTotal ? 'font-bold text-green-700' : 'text-gray-600'}`}>
                              {editingId === goal.id && p.readOnly 
                                ? (editForm[p.key] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                : goal[p.key].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                              }
                            </span>
                          )}
                        </td>
                      ))}

                      <td className="px-4 py-3 sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-inherit text-center border-l border-gray-200">
                        {editingId === goal.id ? (
                          <Button size="sm" onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700 text-white shadow-sm w-[90px] font-semibold">
                            <Check className="h-4 w-4 mr-1"/> Salvar
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleEdit(goal)} className="text-gray-700 bg-white hover:bg-gray-100 border-gray-300 w-[90px] font-medium shadow-sm">
                            <Edit2 className="h-3 w-3 mr-2"/> Editar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {goals.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-white flex justify-end shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
            <Button onClick={handleFinalSave} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 shadow-lg text-md font-bold">
              <Save className="h-5 w-5 mr-2" /> Injetar Metas Atualizadas no Gráfico
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
