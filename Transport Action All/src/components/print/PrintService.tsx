import { TransportService } from '../../services/api';
import { PrintPassenger } from './PrintPassenger';

interface PrintServiceProps {
  service: TransportService;
  [key: string]: any; // Allow React key and other props
}

/**
 * Renders a single transport service in the print layout.
 * Uses CSS grid columns (defined by parent) — each service is one grid row.
 * Height is variable based on passenger count and pickup/dropoff lines.
 */
export function PrintService({ service }: PrintServiceProps) {
  const phone = (service.driverPhone || '').replace(/^'/, '');
  const passengers = service.passengers || [];
  const pickupLines = service.pickupLines || [];
  const dropoffLines = service.dropoffLines || [];

  return (
    <>
      {/* Vehicle — italic bold, top-aligned */}
      <div style={{
        padding: '6px 8px',
        fontSize: '10px',
        border: '1px solid #000',
        fontStyle: 'italic',
        fontWeight: 'bold',
        verticalAlign: 'top'
      }}>
        {service.vehicle || ''}
        {service.hasThenPickup && (
          <div style={{ fontSize: '8px', color: '#666', fontStyle: 'normal', marginTop: '2px' }}>
            ↳ Then
          </div>
        )}
      </div>

      {/* Driver + Phone */}
      <div style={{
        padding: '6px 8px',
        fontSize: '10px',
        border: '1px solid #000',
        verticalAlign: 'top'
      }}>
        <div style={{ fontWeight: 500 }}>{service.driver || ''}</div>
        {phone && <div style={{ fontSize: '9px', color: '#666' }}>{phone}</div>}
      </div>

      {/* Time */}
      <div style={{
        padding: '6px 8px',
        fontSize: '10px',
        border: '1px solid #000',
        whiteSpace: 'nowrap',
        verticalAlign: 'top'
      }}>
        {service.time || ''}
      </div>

      {/* Passengers — variable height, one per line */}
      <div style={{
        padding: '6px 8px',
        fontSize: '10px',
        border: '1px solid #000',
        verticalAlign: 'top'
      }}>
        {passengers.length > 0 ? (
          passengers.map((p, i) => (
            <PrintPassenger key={i} passenger={p} />
          ))
        ) : (
          <span style={{ color: '#999' }}>&nbsp;</span>
        )}
        {service.flightInfo && (
          <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>
            {service.flightInfo}
          </div>
        )}
      </div>

      {/* From (pickupLines) */}
      <div style={{
        padding: '6px 8px',
        fontSize: '10px',
        border: '1px solid #000',
        verticalAlign: 'top'
      }}>
        {pickupLines.length > 0 ? (
          pickupLines.map((line, i) => (
            <div key={i} style={i === 0 ? { fontWeight: 500 } : { fontSize: '9px', color: '#666' }}>
              {line}
            </div>
          ))
        ) : (
          <span style={{ color: '#999' }}>&nbsp;</span>
        )}
      </div>

      {/* To (dropoffLines) */}
      <div style={{
        padding: '6px 8px',
        fontSize: '10px',
        border: '1px solid #000',
        verticalAlign: 'top'
      }}>
        {dropoffLines.length > 0 ? (
          dropoffLines.map((line, i) => (
            <div key={i} style={i === 0 ? { fontWeight: 500 } : { fontSize: '9px', color: '#666' }}>
              {line}
            </div>
          ))
        ) : (
          <span style={{ color: '#999' }}>&nbsp;</span>
        )}
      </div>
    </>
  );
}
