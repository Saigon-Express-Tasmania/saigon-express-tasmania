const TEMPLATE_VAR_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;
const EXTENSION_PLACEHOLDER_PATTERN = /\{\{extension_(\d+)\}\}/g;

export function renderTemplateString(
  template: string,
  variables: Record<string, string | number | boolean>,
): string {
  return template.replace(TEMPLATE_VAR_PATTERN, (full, key: string) => {
    const value = variables[key];
    if (value === undefined || value === "") return full;
    return String(value);
  });
}

export function renderTemplateExtensionRows(
  extensionTemplate: string,
  rows: Record<string, string | number | boolean>[],
): string {
  return rows
    .map((row) => renderTemplateString(extensionTemplate, row))
    .join("\n");
}

/** extension_1 -> extensions[0], extension_2 -> extensions[1], etc. */
export function resolveExtensionTemplate(
  extensions: string[] | null | undefined,
  extensionNumber: number,
): string {
  const template = extensions?.[extensionNumber - 1]?.trim();
  if (!template) {
    throw new Error(`Email template extension_${extensionNumber} is not configured`);
  }
  return template;
}

export function renderExtensionVariables(
  extensions: string[] | null | undefined,
  rows: Record<string, string | number | boolean>[],
): Record<string, string> {
  const rendered: Record<string, string> = {};
  const list = extensions ?? [];

  for (let index = 0; index < list.length; index += 1) {
    const template = list[index]?.trim();
    if (!template) continue;
    rendered[`extension_${index + 1}`] = renderTemplateExtensionRows(template, rows);
  }

  return rendered;
}

export function renderTemplateWithExtensions(
  body: string,
  variables: Record<string, string | number | boolean>,
  htmlExtensions: string[] | null | undefined,
  textExtensions: string[] | null | undefined,
  rows: Record<string, string | number | boolean>[],
  mode: "html" | "text",
): string {
  const extensions = mode === "html" ? htmlExtensions : textExtensions;
  const extensionVariables = renderExtensionVariables(extensions, rows);

  return renderTemplateString(body, {
    ...variables,
    ...extensionVariables,
  });
}

export function listExtensionPlaceholders(body: string): number[] {
  const numbers = new Set<number>();
  for (const match of body.matchAll(EXTENSION_PLACEHOLDER_PATTERN)) {
    const extensionNumber = Number(match[1]);
    if (Number.isFinite(extensionNumber) && extensionNumber > 0) {
      numbers.add(extensionNumber);
    }
  }
  return [...numbers].sort((a, b) => a - b);
}
