import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/constants';
import { languageKeyToLabel } from '@/lib/utils';
import type { LanguageKey } from '@/types';

interface LanguageSelectorProps {
  value: LanguageKey;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function LanguageSelector({
  value,
  onValueChange,
  disabled,
}: LanguageSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent className="z-180">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {languageKeyToLabel(lang)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
