interface PrintFooterProps {
  contacts: { name: string; role: string; phone: string; email: string }[];
}

/**
 * Footer section — Arrivals & Departures header + contact details.
 * Matches the Excel footer layout.
 */
export function PrintFooter({ contacts }: PrintFooterProps) {
  if (!contacts || contacts.length === 0) return null;

  return (
    <div style={{ marginTop: '4px', border: '2px solid #000' }}>
      {/* Arrivals & Departures header */}
      <div style={{
        padding: '4px',
        textAlign: 'center',
        fontSize: '11px',
        fontWeight: 'bold',
        background: '#7ecfc0',
        border: '1px solid #000'
      }}>
        Arrivals&amp;Departures
      </div>
      {/* Contact details */}
      <div style={{
        padding: '8px 16px',
        textAlign: 'center',
        background: '#e8e8e8'
      }}>
        {contacts.map((c, i) => (
          <div key={i} style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <span style={{ fontWeight: 'bold' }}>{c.name}</span>
            {c.role && <span> ({c.role})</span>}
            {c.phone && <span> {c.phone.replace(/^'/, '')}</span>}
            {c.email && <span>  {c.email}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
