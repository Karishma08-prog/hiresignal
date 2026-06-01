import type { ReactNode } from "react";

type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T extends Record<string, ReactNode | number | string | null>>({
  columns,
  rows,
  emptyMessage = "No rows to display yet.",
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/88 shadow-[0_18px_48px_rgba(37,99,235,0.14)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-blue-100">
          <thead className="bg-blue-50/90">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={[
                    "px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.24em] text-black/60",
                    column.className ?? "",
                  ].join(" ")}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={String(row.id ?? rowIndex)} className="hover:bg-blue-50/70">
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className="px-5 py-4 text-sm text-black/80"
                    >
                      {column.render
                        ? column.render(row)
                        : (row[column.key as keyof T] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-8 text-center text-sm text-black/60"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

