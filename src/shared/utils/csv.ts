/**
 * Convierte un arreglo de objetos JSON a formato CSV
 */
export function convertToCSV(
  data: Record<string, any>[],
  fields: { label: string; key: string }[]
): string {
  // BOM de UTF-8 para que Excel lo abra correctamente con acentos y caracteres latinos
  const BOM = "\uFEFF";
  const header = fields.map((f) => `"${f.label.replace(/"/g, '""')}"`).join(",");
  const rows = data.map((row) => {
    return fields
      .map((f) => {
        const val = row[f.key];
        const stringVal = val === null || val === undefined ? "" : String(val);
        // Escapar comillas dobles internas
        return `"${stringVal.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  return BOM + [header, ...rows].join("\r\n");
}
