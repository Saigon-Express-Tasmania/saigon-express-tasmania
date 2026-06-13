import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AUSTRALIAN_STATES,
  australianStateLabel,
  parseAustralianStateCode,
  type AustralianStateCode,
} from '@/lib/australian-states';
import { SalesOrderFormField } from './SalesOrderFormField';

type SalesOrderStateFieldProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
};

export function SalesOrderStateField({
  id,
  label = 'State',
  value,
  onChange,
  readOnly = false,
  disabled = false,
}: SalesOrderStateFieldProps) {
  const selectValue = parseAustralianStateCode(value) ?? '';

  return (
    <SalesOrderFormField
      label={label}
      htmlFor={id}
      readOnly={readOnly}
      value={australianStateLabel(value)}
    >
      <Select
        value={selectValue}
        disabled={disabled}
        onValueChange={(next) => onChange(next as AustralianStateCode)}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select state" />
        </SelectTrigger>
        <SelectContent>
          {AUSTRALIAN_STATES.map((state) => (
            <SelectItem key={state.value} value={state.value}>
              {state.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SalesOrderFormField>
  );
}
