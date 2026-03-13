/**
 * Extract the first balanced JSON object from a string.
 * Handles: markdown fences, trailing text with braces, truncated responses.
 */
export function extractJSON(raw: string): Record<string, unknown> | null {
  // Strip markdown code fences
  const text = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = text.indexOf("{");
  if (start === -1) return null;

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
    // Remove trailing incomplete string/value
    truncated = truncated.replace(/,\s*"[^"]*$/, "");
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

function tryParse(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str);
  } catch {
    // Fix trailing commas and control characters, then retry
    try {
      const fixed = str
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/[\x00-\x1F\x7F]/g, (c) =>
          c === "\n" || c === "\t" ? c : ""
        );
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}
