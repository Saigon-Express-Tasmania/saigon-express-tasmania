/** Matches SES-style merge fields: {{variable_name}} */
const SES_TEMPLATE_VAR_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

/** Convert SES-style {{var}} placeholders to Brevo {{params.var}} at sync time. */
export function sesPlaceholdersToBrevo(content: string): string {
  return content.replace(
    SES_TEMPLATE_VAR_PATTERN,
    (_match, key: string) => {
      if (/^extension_\d+$/.test(key)) {
        return `{% autoescape off %}{{params.${key}}}{% endautoescape %}`;
      }
      return `{{params.${key}}}`;
    },
  );
}
