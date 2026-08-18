interface PrintHeaderProps {
  production: string;
  projectName: string;
  transportCompany: string;
  dateStr: string;
}

export function PrintHeader({ production, projectName, transportCompany, dateStr }: PrintHeaderProps) {
  return (
    <div style={{ border: '2px solid #000' }}>
      {/* Row 1: Production | Project Name | Transport Company */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div style={{
          padding: '12px 16px',
          fontWeight: 'bold',
          fontSize: '12px',
          textAlign: 'center',
          textTransform: 'uppercase',
          borderRight: '1px solid #000'
        }}>
          {production || 'Production'}
        </div>
        <div style={{
          padding: '12px 16px',
          textAlign: 'center',
          borderRight: '1px solid #000'
        }}>
          <span style={{
            fontFamily: 'Georgia, serif',
            fontSize: '28px',
            fontWeight: 'bold',
            fontStyle: 'italic'
          }}>
            {projectName || 'Project'}
          </span>
        </div>
        <div style={{
          padding: '12px 16px',
          fontWeight: 'bold',
          fontSize: '12px',
          textAlign: 'center',
          textTransform: 'uppercase'
        }}>
          {transportCompany || 'Transport Co.'}
        </div>
      </div>
      {/* Row 2: Date subtitle */}
      <div style={{
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: '500',
        borderTop: '1px solid #000',
        background: '#e8e8e8'
      }}>
        Prep. Transport List {dateStr || ''}
      </div>
    </div>
  );
}
