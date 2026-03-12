import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { GoalRecord } from '@/types/goals';

type GoalManagerProps = {
  onSaveGoals: (goals: GoalRecord[]) => void;
  currentGoals?: GoalRecord[];
};

type EditableGoal = {
  id: string;
  idUsuario: string;
  produto: string;
  rubrica: string;
  marco: number;
  primeiroTrimestre: number;
  raw: Record<string, any>;
};

const MONTH_MAP: Array<{ label: string; keys: string[]; target: keyof GoalRecord }> = [
  { label: 'janeiro', keys: ['janeiro'], target: 'janeiro' },
  { label: 'fevereiro', keys: ['fevereiro'], target: 'fevereiro' },
  { label: 'marco', keys: ['marco', 'março'], target: 'marco' },
  { label: 'abril', keys: ['abril'], target: 'abril' },
  { label: 'maio', keys: ['maio'], target: 'maio' },
  { label: 'junho', keys: ['junho'], target: 'junho' },
  { label: 'julho', keys: ['julho'], target: 'julho' },
  { label: 'agosto', keys: ['agosto'], target: 'agosto' },
  { label: 'setembro', keys: ['setembro'], target: 'setembro' },
  { label: 'outubro', keys: ['outubro'], target: 'outubro' },
  { label: 'novembro', keys: ['novembro'], target: 'novembro' },
  { label: 'dezembro', keys: ['dezembro'], target: 'dezembro' },
  { label: '1tri', keys: ['1ºtri', '1otri', '1 tri', '1º trimestre'], target: 'primeiroTrimestre' },
  { label: '2tri', keys: ['2ºtri', '2otri', '2 tri', '2º trimestre'], target: 'segundoTrimestre' },
  { label: '3tri', keys: ['3ºtri', '3otri', '3 tri', '3º trimestre'], target: 'terceiroTrimestre' },
  { label: '4tri', keys: ['4ºtri', '4otri', '4 tri', '4º trimestre'], target: 'quartoTrimestre' },
  { label: 'total', keys: ['total ano', 'total'], target: 'totalAno' },
];

const normalize = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeId = (value: unknown): string => {
  const str = String(value ?? '').trim();
  return str.endsWith('.0') ? str.slice(0, -2) : str;
};

const parseMoney = (value: unknown): number => {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;
  let text = String(value).trim().replace(/[^\d,.-]/g, '');
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(text);
  return Number.isNaN(num) ? 0 : num;
};

const parseCsvRows = (text: string): Record<string, string>[] => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = (lines[0].split(';').length >= lines[0].split(',').length) ? ';' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? '').trim();
    });
    return row;
  });
};

const getByFuzzy = (row: Record<string, any>, aliases: string[]) => {
  const normalizedAliases = aliases.map(normalize);
  for (const [key, value] of Object.entries(row)) {
    const n = normalize(key);
    if (normalizedAliases.includes(n)) return value;
  }
  return undefined;
};

export function GoalManager({ onSaveGoals, currentGoals = [] }: GoalManagerProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<EditableGoal[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    if (rows.length > 0) return `${rows.length} metas carregadas`;
    if (currentGoals.length > 0) return `${currentGoals.length} metas validadas`; 
    return 'Sem metas validadas';
  }, [rows.length, currentGoals.length]);

  const buildGoalRecord = (row: EditableGoal): GoalRecord => {
    const data: GoalRecord = {
      produto: row.produto,
      idUsuario: row.idUsuario,
      rubrica: row.rubrica,
      janeiro: 0,
      fevereiro: 0,
      marco: row.marco,
      primeiroTrimestre: row.primeiroTrimestre,
      abril: 0,
      maio: 0,
      junho: 0,
      segundoTrimestre: 0,
      julho: 0,
      agosto: 0,
      setembro: 0,
      terceiroTrimestre: 0,
      outubro: 0,
      novembro: 0,
      dezembro: 0,
      quartoTrimestre: 0,
      totalAno: 0,
    };

    MONTH_MAP.forEach(({ keys, target }) => {
      const value = getByFuzzy(row.raw, keys);
      if (value !== undefined) {
        (data[target] as number) = parseMoney(value);
      }
    });

    return data;
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      let parsedRows: Record<string, any>[] = [];
      const ext = file.name.toLowerCase();

      if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        parsedRows = parseCsvRows(csv);
      } else {
        const text = await file.text();
        parsedRows = parseCsvRows(text);
      }

      const cleanRows: EditableGoal[] = parsedRows
        .map((row, index) => {
          const idUsuario = normalizeId(
            getByFuzzy(row, ['id usuario erp', 'id usuario', 'usuario', 'id'])
          );
          const produto = String(getByFuzzy(row, ['produto']) ?? '').trim();
          const rubrica = String(getByFuzzy(row, ['rubrica']) ?? '').trim();

          if (!idUsuario || !produto || !rubrica) return null;

          const metaMarco = parseMoney(getByFuzzy(row, ['marco', 'março']));
          const metaPrimeiroTri = parseMoney(getByFuzzy(row, ['1ºtri', '1otri', '1 tri', '1º trimestre']));

          return {
            id: `${idUsuario}-${produto}-${rubrica}-${index}`,
            idUsuario,
            produto,
            rubrica,
            marco: metaMarco,
            primeiroTrimestre: metaPrimeiroTri,
            raw: row,
          };
        })
        .filter(Boolean) as EditableGoal[];

      setRows(cleanRows);
      toast.success(`Arquivo de metas carregado com ${cleanRows.length} linhas válidas.`);
    } catch (error) {
      toast.error('Falha ao ler arquivo de metas. Verifique o formato do arquivo.');
      console.error(error);
    }
  };

  const handleSaveGoals = () => {
    const cleanGoals = rows.map(buildGoalRecord);
    onSaveGoals(cleanGoals);
    toast.success(`Metas validadas salvas: ${cleanGoals.length} linhas.`);
    setOpen(false);
  };

  const updateRow = (id: string, field: 'marco' | 'primeiroTrimestre', value: number) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
          Gestor de Metas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Gestor Interativo de Metas</DialogTitle>
          <DialogDescription>
            Upload, validação e edição inline das metas. Fonte única de verdade do painel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <span className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent">
                Upload metas_2025 (.xlsx/.csv)
              </span>
            </label>
            <span className="text-xs text-muted-foreground">{statusLabel}</span>
          </div>

          <div className="max-h-[420px] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Usuário</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Rubrica</TableHead>
                  <TableHead>Meta Março</TableHead>
                  <TableHead>Meta 1º Tri</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const editing = editingId === row.id;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.idUsuario}</TableCell>
                      <TableCell>{row.produto}</TableCell>
                      <TableCell>{row.rubrica}</TableCell>
                      <TableCell>
                        {editing ? (
                          <Input
                            type="number"
                            value={row.marco}
                            onChange={(e) => updateRow(row.id, 'marco', Number(e.target.value || 0))}
                          />
                        ) : (
                          row.marco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        )}
                      </TableCell>
                      <TableCell>
                        {editing ? (
                          <Input
                            type="number"
                            value={row.primeiroTrimestre}
                            onChange={(e) => updateRow(row.id, 'primeiroTrimestre', Number(e.target.value || 0))}
                          />
                        ) : (
                          row.primeiroTrimestre.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        )}
                      </TableCell>
                      <TableCell>
                        {editing ? (
                          <Button size="sm" onClick={() => setEditingId(null)}>Salvar</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setEditingId(row.id)}>Editar</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma meta carregada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveGoals} disabled={rows.length === 0}>Salvar Metas Validadas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
