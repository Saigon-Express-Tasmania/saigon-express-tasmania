import { GroupedCategorySelect } from '@/components/GroupedCategorySelect';
import {
  buildTaxonomyFilterSections,
  taxonomyLabelById,
  type TaxonomyFilterOption,
} from '@/lib/taxonomy-filter-sections';
import { useMemo } from 'react';

type TaxonomyGroupedCategorySelectProps = {
  id?: string;
  taxonomies: TaxonomyFilterOption[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyOptionLabel?: string;
  className?: string;
  orphanSectionLabel?: string;
};

export function TaxonomyGroupedCategorySelect({
  id,
  taxonomies,
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Search categories…',
  emptyOptionLabel = 'None',
  className,
  orphanSectionLabel,
}: TaxonomyGroupedCategorySelectProps) {
  const sections = useMemo(
    () => buildTaxonomyFilterSections(taxonomies),
    [taxonomies],
  );
  const selectedLabelById = useMemo(
    () => taxonomyLabelById(taxonomies),
    [taxonomies],
  );

  return (
    <GroupedCategorySelect
      id={id}
      sections={sections}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      placeholder={placeholder}
      emptyOptionLabel={emptyOptionLabel}
      className={className}
      orphanSectionLabel={orphanSectionLabel}
      selectedLabelById={selectedLabelById}
    />
  );
}
