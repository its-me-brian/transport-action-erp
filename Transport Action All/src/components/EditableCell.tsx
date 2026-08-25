import React from 'react';
import { Edit3 } from 'lucide-react';

interface EditableCellProps {
  rowId: string;
  field: string;
  value: string;
  type?: 'text' | 'select';
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onStartEdit: (rowId: string, field: string, value: string) => void;
  onSave: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const EditableCell = React.memo(function EditableCell({
  rowId,
  field,
  value,
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onSave,
  onKeyDown,
}: EditableCellProps) {
  const isEmpty = !value || value.trim() === '';

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onSave}
          className="w-full px-2 py-1 text-[12px] border border-primary rounded bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded hover:bg-primary/5 ${isEmpty ? 'text-red-500 italic' : ''}`}
      onClick={() => onStartEdit(rowId, field, value)}
    >
      <span className="truncate">{isEmpty ? '(vacío)' : value}</span>
      <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0" />
    </div>
  );
});
export default EditableCell;
