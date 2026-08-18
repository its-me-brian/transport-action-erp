import { Passenger } from '../../services/api';

interface PrintPassengerProps {
  passenger: Passenger;
  [key: string]: any; // Allow React key and other props
}

/**
 * Renders a single passenger in the print layout.
 * Format: "Name (Role)" if role exists, otherwise just "Name".
 */
export function PrintPassenger({ passenger }: PrintPassengerProps) {
  const { name, role } = passenger;
  
  if (!name) return null;
  
  return (
    <div style={{ lineHeight: '1.4' }}>
      <span style={{ fontWeight: 500 }}>{name}</span>
      {role && <span style={{ color: '#666' }}> ({role})</span>}
    </div>
  );
}
