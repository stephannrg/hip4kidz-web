const INK = '#22252b';

const btnStyle = () => ({
  height: 32, padding: '0 12px', border: `1px solid #e2e2e2`,
  background: '#fff', color: '#666',
  fontSize: 11.5, letterSpacing: '0.04em', cursor: 'pointer',
});

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = [50, 100, 'all'] }) {
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : pageSize === 'all' ? 1 : (page - 1) * pageSize + 1;
  const to = pageSize === 'all' ? total : Math.min(page * pageSize, total);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', flexWrap: 'wrap', gap: 16 }}>
      <div style={{ fontSize: 12.5, color: '#999' }}>
        {total === 0 ? 'Geen resultaten' : `${from}–${to} of ${total}`}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: '#999' }}>Per pagina</span>
          <div style={{ display: 'flex', border: '1px solid #e2e2e2' }}>
            {pageSizeOptions.map((size) => (
              <button
                key={size}
                onClick={() => onPageSizeChange(size)}
                style={{
                  height: 30, padding: '0 12px', border: 'none',
                  background: pageSize === size ? INK : '#fff', color: pageSize === size ? '#fff' : '#777',
                  fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                {size === 'all' ? 'Alles' : size}
              </button>
            ))}
          </div>
        </div>

        {pageSize !== 'all' && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} style={btnStyle()}>‹ Vorige</button>
            <span style={{ fontSize: 12, color: '#999', padding: '0 6px' }}>{page} / {totalPages}</span>
            <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={btnStyle()}>Volgende ›</button>
          </div>
        )}
      </div>
    </div>
  );
}
