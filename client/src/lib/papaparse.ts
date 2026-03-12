type ParseOptions = {
  delimiter?: string;
  header?: boolean;
  skipEmptyLines?: boolean;
  complete?: (results: { data: any[] }) => void;
};

const splitCsvLine = (line: string, delimiter: string): string[] => {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
};

const Papa = {
  parse(file: File, options: ParseOptions) {
    file.text().then((text) => {
      const delimiter = options.delimiter ?? ',';
      const lines = text.split(/\r?\n/);
      const rows = options.skipEmptyLines ? lines.filter((l) => l.trim() !== '') : lines;

      if (!rows.length) {
        options.complete?.({ data: [] });
        return;
      }

      if (options.header) {
        const headers = splitCsvLine(rows[0], delimiter).map((h) => h.trim());
        const data = rows.slice(1).map((line) => {
          const cols = splitCsvLine(line, delimiter);
          const record: Record<string, string> = {};
          headers.forEach((h, idx) => {
            record[h] = (cols[idx] ?? '').trim();
          });
          return record;
        });
        options.complete?.({ data });
        return;
      }

      options.complete?.({ data: rows.map((line) => splitCsvLine(line, delimiter)) });
    });
  },
};

export default Papa;
