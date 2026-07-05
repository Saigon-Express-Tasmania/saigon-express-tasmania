import type { AdminCategoryFilterSection } from '@/lib/category-filter-sections';
import type { AdminCategoryOption } from '@/lib/categories';

export type CategoryGroupTheme = {
  label: string;
  bar: string;
  dot: string;
  badge: string;
  badgeEmpty: string;
  item: string;
  chip: string;
  checkbox: string;
};

export const CATEGORY_GROUP_THEMES: CategoryGroupTheme[] = [
  {
    label: 'text-violet-700 dark:text-violet-300',
    bar: 'bg-gradient-to-b from-violet-500 to-fuchsia-500',
    dot: 'bg-violet-500',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200',
    badgeEmpty: 'bg-muted text-muted-foreground',
    item: 'hover:bg-violet-50 focus:bg-violet-50 dark:hover:bg-violet-950/40 dark:focus:bg-violet-950/40',
    chip: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200',
    checkbox: 'border-violet-500 bg-violet-500 text-white',
  },
  {
    label: 'text-sky-700 dark:text-sky-300',
    bar: 'bg-gradient-to-b from-sky-500 to-cyan-500',
    dot: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200',
    badgeEmpty: 'bg-muted text-muted-foreground',
    item: 'hover:bg-sky-50 dark:hover:bg-sky-950/40',
    chip: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200',
    checkbox: 'border-sky-500 bg-sky-500 text-white',
  },
  {
    label: 'text-amber-700 dark:text-amber-300',
    bar: 'bg-gradient-to-b from-amber-500 to-orange-500',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    badgeEmpty: 'bg-muted text-muted-foreground',
    item: 'hover:bg-amber-50 dark:hover:bg-amber-950/40',
    chip: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
    checkbox: 'border-amber-500 bg-amber-500 text-white',
  },
  {
    label: 'text-emerald-700 dark:text-emerald-300',
    bar: 'bg-gradient-to-b from-emerald-500 to-green-500',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    badgeEmpty: 'bg-muted text-muted-foreground',
    item: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    checkbox: 'border-emerald-500 bg-emerald-500 text-white',
  },
  {
    label: 'text-indigo-700 dark:text-indigo-300',
    bar: 'bg-gradient-to-b from-indigo-500 to-blue-500',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
    badgeEmpty: 'bg-muted text-muted-foreground',
    item: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/40',
    chip: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200',
    checkbox: 'border-indigo-500 bg-indigo-500 text-white',
  },
  {
    label: 'text-rose-700 dark:text-rose-300',
    bar: 'bg-gradient-to-b from-rose-500 to-pink-500',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
    badgeEmpty: 'bg-muted text-muted-foreground',
    item: 'hover:bg-rose-50 dark:hover:bg-rose-950/40',
    chip: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200',
    checkbox: 'border-rose-500 bg-rose-500 text-white',
  },
];

export const ORPHAN_CATEGORY_THEME: CategoryGroupTheme = {
  label: 'text-slate-600 dark:text-slate-300',
  bar: 'bg-gradient-to-b from-slate-400 to-slate-500',
  dot: 'bg-slate-400',
  badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  badgeEmpty: 'bg-muted text-muted-foreground',
  item: 'hover:bg-slate-50 dark:hover:bg-slate-900/60',
  chip: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  checkbox: 'border-slate-500 bg-slate-500 text-white',
};

export const ALL_CATEGORIES_THEME = {
  badge: 'bg-primary/15 text-primary font-semibold',
  item: 'focus:bg-primary/10 font-medium',
};

export function categoryGroupTheme(index: number): CategoryGroupTheme {
  return CATEGORY_GROUP_THEMES[index % CATEGORY_GROUP_THEMES.length];
}

export function flattenCategorySections(
  sections: AdminCategoryFilterSection[],
): AdminCategoryOption[] {
  return sections.flatMap((section) => section.categories);
}

export function buildCategoryThemeById(
  sections: AdminCategoryFilterSection[],
): Map<number, CategoryGroupTheme> {
  const themeById = new Map<number, CategoryGroupTheme>();
  let groupThemeIndex = 0;

  for (const section of sections) {
    const theme =
      section.type === 'orphans'
        ? ORPHAN_CATEGORY_THEME
        : categoryGroupTheme(groupThemeIndex++);

    for (const category of section.categories) {
      themeById.set(category.id, theme);
    }
  }

  return themeById;
}

export function buildGroupThemeIndexById(
  sections: AdminCategoryFilterSection[],
): Map<number, number> {
  const indexByGroupId = new Map<number, number>();
  let groupThemeIndex = 0;

  for (const section of sections) {
    if (section.type !== 'group') continue;
    indexByGroupId.set(section.groupId, groupThemeIndex++);
  }

  return indexByGroupId;
}

export function filterCategorySections(
  sections: AdminCategoryFilterSection[],
  query: string,
): AdminCategoryFilterSection[] {
  const term = query.trim().toLowerCase();
  if (!term) return sections;

  return sections
    .map((section) => {
      const categories = section.categories.filter((category) =>
        category.name.toLowerCase().includes(term),
      );
      if (categories.length === 0) return null;

      if (section.type === 'orphans') {
        return { type: 'orphans' as const, categories };
      }

      return {
        type: 'group' as const,
        groupId: section.groupId,
        groupName: section.groupName,
        categories,
      };
    })
    .filter((section): section is AdminCategoryFilterSection => section != null);
}
