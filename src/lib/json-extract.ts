/**
 * Extract the first balanced JSON object from a string.
 * Handles: markdown fences, trailing text with braces, truncated responses,
 * literal newlines inside strings, unescaped control chars.
 */
export function extractJSON(raw: string): Record<string, unknown> | null {
  // Strip markdown code fences
  let text = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Quick attempt: fix newlines and parse directly
  const quick = tryParse(text);
  if (quick) return quick;

  const start = text.indexOf("{");
  if (start === -1) return null;

  // Fix literal newlines inside JSON strings before walking braces
  text = fixNewlinesInStrings(text);

  // Walk through and find balanced braces
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(start, i + 1);
          return tryParse(candidate);
        }
      }
    }
  }

  // Unbalanced — likely truncated. Try to repair.
  if (depth > 0) {
    let truncated = text.slice(start);
    // Remove trailing incomplete key-value or string
    truncated = truncated.replace(/,\s*"[^"]*$/, "");
    truncated = truncated.replace(/,\s*\{[^}]*$/, "");
    truncated = truncated.replace(/,\s*$/, "");
    // Close open structures
    const openBrackets = (truncated.match(/\[/g) || []).length;
    const closeBrackets = (truncated.match(/\]/g) || []).length;
    const openBraces = (truncated.match(/\{/g) || []).length;
    const closeBraces = (truncated.match(/\}/g) || []).length;
    for (let i = 0; i < openBrackets - closeBrackets; i++) truncated += "]";
    for (let i = 0; i < openBraces - closeBraces; i++) truncated += "}";
    return tryParse(truncated);
  }

  return null;
}

/**
 * Fix literal newlines/tabs inside JSON strings while preserving
 * whitespace between tokens. Uses a state machine to track string context.
 */
function fixNewlinesInStrings(str: string): string {
  let result = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (escape) {
      result += ch;
      escape = false;
      continue;
    }

    if (ch === "\\" && inString) {
      result += ch;
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString && (ch === "\n" || ch === "\r")) {
      result += "\\n";
      // Skip \r\n pairs
      if (ch === "\r" && str[i + 1] === "\n") i++;
      continue;
    }

    if (inString && ch === "\t") {
      result += "\\t";
      continue;
    }

    result += ch;
  }

  return result;
}

function tryParse(str: string): Record<string, unknown> | null {
  // Attempt 1: parse as-is
  try {
    return JSON.parse(str);
  } catch { /* continue */ }

  // Attempt 2: fix newlines inside strings + trailing commas
  try {
    const fixed = fixNewlinesInStrings(str).replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(fixed);
  } catch { /* continue */ }

  // Attempt 3: replace all control chars with spaces
  try {
    const fixed = fixNewlinesInStrings(str)
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\x00-\x1F\x7F]/g, (ch) => {
        if (ch === "\n" || ch === "\r" || ch === "\t") return ch;
        return " ";
      });
    return JSON.parse(fixed);
  } catch { /* continue */ }

  // Attempt 4: aggressive cleanup — strip all control chars
  try {
    const fixed = str
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\x00-\x1F\x7F]/g, " ");
    return JSON.parse(fixed);
  } catch { /* continue */ }

  return null;
}
