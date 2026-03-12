import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Save, Trash2, Target, Calculator, User, Package, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

export interface ManualGoal {
  id: string;
  idUsuario: string;
  nomeUsuario: string;
  produto: string;
  rubrica: string;
  ano: string;
  mes: string;
  trimestre: string;
  valor: number;
}

interface GoalManagerProps {
  onSaveGoals: (cleanGoals: ManualGoal[]) => void;
  existingGoals?: ManualGoal[];
}

// Base de Dados Fixa para Lançamentos
const ETNS = [
  { id: '11124', nome: 'Rafael Perotoni' },
  { id: '2642', nome: 'Filipe Cardoso' },
  { id: '9909', nome: 'Mariane Sebaje' },
  { id: '11191', nome: 'Carina Bruder' },
  { id: '11264', nome: 'Jonas Pacheco' },
  { id: '10655', nome: 'Stefanie Christen' },
  { id: '10563', nome: 'Gisele Silva' }
];

const PRODUTOS_CRM = [
  'Gestão Empresarial - ERP',
  'Gestão de Pessoas - HCM',
  'Acesso e Segurança',
  'Ronda Senior',
  'SeniorX',
  'HCM Konviva',
  'HCM JobConvo'
];

const MESES_INFO: Record<string, string> = {
  'Janeiro': '1º Trimestre', 'Fevereiro': '1º Trimestre', 'Março': '1º Trimestre',
  'Abril': '2º Trimestre', 'Maio': '2º Trimestre', 'Junho': '2º Trimestre',
  'Julho': '3º Trimestre', 'Agosto': '3º Trimestre', 'Setembro': '3º Trimestre',
  'Outubro': '4º Trimestre', 'Novembro': '4º Trimestre', 'Dezembro': '4º Trimestre'
};

export function GoalManager({ onSaveGoals, existingGoals = [] }: GoalManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [goalsList, setGoalsList] = useState<ManualGoal[]>(existingGoals);

  // Estado do Formulário
  const [etnId, setEtnId] = useState('');
  const [ano, setAno] = useState('2026');
  const [mes, setMes] = useState('');
  const [produto, setProduto] = useState('');

  // Inputs Financeiros Individuais
  const [valLicenca, setValLicenca] = useState('');
  const [valServico, setValServico] = useState('');
  const [valRecorrente, setValRecorrente] = useState('');

  const parseMoney = (val: string) => {
    if (!val) return 0;
    const num = parseFloat(val.replace(/\./g, '').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  const handleAddGoals = () => {
    if (!etnId || !ano || !mes || !produto) {
      toast.error('Por favor, preencha o ETN, Ano, Mês e Produto.');
      return;
    }

    const licencaNum = parseMoney(valLicenca);
    const servicoNum = parseMoney(valServico);
    const recorrenteNum = parseMoney(valRecorrente);

    if (licencaNum === 0 && servicoNum === 0 && recorrenteNum === 0) {
      toast.error('Informe o valor em Reais (R$) de pelo menos uma rubrica.');
      return;
    }

    const selectedEtn = ETNS.find(e => e.id === etnId);
    const trimestreCalculado = MESES_INFO[mes];

    const newGoals: ManualGoal[] = [];
    const baseGoal = {
      idUsuario: etnId,
      nomeUsuario: selectedEtn?.nome || '',
      produto,
      ano,
      mes,
      trimestre: trimestreCalculado
    };

    if (licencaNum > 0) newGoals.push({ ...baseGoal, id: `g-${Date.now()}-lic`, rubrica: 'Setup + Licenças', valor: licencaNum });
    if (servicoNum > 0) newGoals.push({ ...baseGoal, id: `g-${Date.now()}-srv`, rubrica: 'Serviços Não Recorrentes', valor: servicoNum });
    if (recorrenteNum > 0) newGoals.push({ ...baseGoal, id: `g-${Date.now()}-rec`, rubrica: 'Recorrente', valor: recorrenteNum });

    setGoalsList([...newGoals, ...goalsList]);
    toast.success(`${newGoals.length} meta(s) criadas com sucesso para ${selectedEtn?.nome}!`);

    // Zera os valores financeiros para o próximo lançamento
    setValLicenca('');
    setValServico('');
    setValRecorrente('');
  };

  const handleFinalSave = () => {
    onSaveGoals(goalsList);
    toast.success('Metas integradas! O sistema cruzará os pedidos automaticamente.');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          <Target className="h-4 w-4" /> Gestão de Metas (Lançamento)
        </Button>
      </DialogTrigger>

      {/* TELA CHEIA ABSOLUTA (Ignorando limites do Tailwind) */}
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen m-0 p-0 rounded-none border-0 flex flex-col bg-slate-50">

        {/* Cabeçalho */}
        <DialogHeader className="px-8 py-5 border-b bg-white shrink-0 shadow-sm flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Target className="h-7 w-7 text-indigo-600" /> Painel de Metas Anuais
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">Lançamento de metas diretas. Esqueça as planilhas do Excel.</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold">
              Total Lançado: {goalsList.length} linhas
            </div>
            <Button onClick={() => setIsOpen(false)} variant="outline" className="border-slate-300">Fechar Janela</Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

          {/* LADO ESQUERDO: FORMULÁRIO (30% da tela) */}
          <div className="w-full lg:w-[400px] xl:w-[450px] bg-white border-r border-slate-200 p-8 flex flex-col gap-6 overflow-y-auto shadow-xl z-10">

            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 border-b pb-3"><User className="w-5 h-5 text-slate-500" /> Responsável e Data</h3>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-600">ETN / Executivo</label>
                <Select value={etnId} onValueChange={setEtnId}>
                  <SelectTrigger className="bg-white h-11"><SelectValue placeholder="Selecione o titular da meta" /></SelectTrigger>
                  <SelectContent>
                    {ETNS.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <div className="space-y-1.5 w-1/3">
                  <label className="text-sm font-bold text-slate-600">Ano</label>
                  <Select value={ano} onValueChange={setAno}>
                    <SelectTrigger className="bg-white h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 w-2/3">
                  <label className="text-sm font-bold text-slate-600">Competência</label>
                  <Select value={mes} onValueChange={setMes}>
                    <SelectTrigger className="bg-white h-11"><SelectValue placeholder="Escolha o Mês" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(MESES_INFO).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {mes && (
                <div className="bg-green-50 text-green-700 text-xs p-2 rounded flex items-center gap-2">
                  <Calculator className="w-3 h-3" /> Calculado automaticamente: <b>{MESES_INFO[mes]}</b>
                </div>
              )}
            </div>

            <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
              <h3 className="font-bold text-indigo-800 flex items-center gap-2 border-b border-indigo-100 pb-3"><Package className="w-5 h-5 text-indigo-500" /> Produto e Valores Financeiros</h3>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-600">Produto CRM</label>
                <Select value={produto} onValueChange={setProduto}>
                  <SelectTrigger className="bg-white h-11"><SelectValue placeholder="Selecione o produto do CRM" /></SelectTrigger>
                  <SelectContent>
                    {PRODUTOS_CRM.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-slate-600 w-24 leading-tight">Licenças</label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-3 text-slate-400 font-semibold text-sm">R$</span>
                    <Input placeholder="0,00" value={valLicenca} onChange={e => setValLicenca(e.target.value)} className="pl-9 h-11 font-bold text-indigo-700 bg-white" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-slate-600 w-24 leading-tight">Serviços</label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-3 text-slate-400 font-semibold text-sm">R$</span>
                    <Input placeholder="0,00" value={valServico} onChange={e => setValServico(e.target.value)} className="pl-9 h-11 font-bold text-indigo-700 bg-white" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-slate-600 w-24 leading-tight">Recorrente</label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-3 text-slate-400 font-semibold text-sm">R$</span>
                    <Input placeholder="0,00" value={valRecorrente} onChange={e => setValRecorrente(e.target.value)} className="pl-9 h-11 font-bold text-indigo-700 bg-white" />
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={handleAddGoals} className="w-full bg-slate-900 hover:bg-black text-white h-14 text-base shadow-lg mt-auto shrink-0 transition-transform active:scale-95">
              <PlusCircle className="h-5 w-5 mr-2" /> Adicionar à Tabela de Metas
            </Button>
          </div>

          {/* LADO DIREITO: GRID DE CONFERÊNCIA (Restante da tela) */}
          <div className="flex-1 bg-slate-100 p-8 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-slate-700 flex items-center gap-2">
                <CalendarDays className="text-slate-500" /> Resumo de Metas Prontas
              </h3>
              {goalsList.length > 0 && (
                <Button onClick={handleFinalSave} className="bg-green-600 hover:bg-green-700 text-white px-8 h-12 text-md shadow-lg transition-transform active:scale-95">
                  <Save className="h-5 w-5 mr-2" /> Salvar Definitivamente e Fechar
                </Button>
              )}
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-auto">
              {goalsList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                  <Target className="h-20 w-20 mb-4 opacity-20 text-indigo-500" />
                  <p className="text-2xl font-bold text-slate-300">A tabela está vazia.</p>
                  <p className="text-base mt-2 max-w-md">Preencha o formulário na lateral esquerda para adicionar metas. As linhas aparecerão organizadas aqui.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-sm text-slate-600 uppercase bg-slate-100/80 sticky top-0 shadow-sm z-10 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-4 font-extrabold">ETN / Responsável</th>
                      <th className="px-6 py-4 font-extrabold">Produto CRM & Rubrica</th>
                      <th className="px-6 py-4 font-extrabold">Competência / Tri</th>
                      <th className="px-6 py-4 font-extrabold text-right">Valor Meta</th>
                      <th className="px-6 py-4 text-center w-20">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {goalsList.map(goal => (
                      <tr key={goal.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 text-base">{goal.nomeUsuario}</div>
                          <div className="text-xs font-semibold text-slate-400">ID ERP: {goal.idUsuario}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-700">{goal.produto}</div>
                          <div className="text-sm font-medium text-slate-500 mt-0.5">{goal.rubrica}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md text-sm font-bold border border-indigo-200">
                            {goal.mes}
                          </span>
                          <div className="text-xs font-semibold text-slate-400 mt-2">{goal.trimestre} • {goal.ano}</div>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-800 text-right text-lg">
                          {goal.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button variant="ghost" size="icon" onClick={() => setGoalsList(goalsList.filter(g => g.id !== goal.id))} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10 w-10">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
