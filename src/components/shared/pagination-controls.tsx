export function PaginationControls({
  page,
  totalPages,
  itemLabel = "items",
  pageSize,
  totalItems,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  itemLabel?: string;
  pageSize: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-blue-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-black/60">
        Showing {start}-{end} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page <= 1}
          className="rounded-full border border-blue-100 px-4 py-2 text-sm font-semibold text-black/80 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-2 text-sm text-black/60">
          Page {totalPages === 0 ? 0 : page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="rounded-full border border-blue-100 px-4 py-2 text-sm font-semibold text-black/80 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

