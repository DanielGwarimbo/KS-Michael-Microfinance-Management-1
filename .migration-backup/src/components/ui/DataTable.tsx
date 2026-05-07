import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Column {
  key: string;
  header: string;
  render?: (item: any) => ReactNode;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (item: any) => void;
  actions?: (item: any) => ReactNode;
  emptyMessage?: string;
}

export default function DataTable({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  onRowClick,
  actions,
  emptyMessage = 'No data found',
}: DataTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = search
    ? data.filter((item) =>
        columns.some((col) => {
          const val = item[col.key];
          return val && String(val).toLowerCase().includes(search.toLowerCase());
        })
      )
    : data;

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      {searchable && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((item, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(item)}
                  className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-sm text-gray-900 ${col.className || ''}`}>
                      {col.render ? col.render(item) : (item[col.key] as ReactNode) ?? '—'}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {actions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
