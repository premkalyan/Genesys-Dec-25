// PII Detection Service
// In production, this would use Microsoft Presidio or similar

import { PIIEntity, PIIAuditEntry } from './types';

// Regex patterns for common PII
const PII_PATTERNS: Record<string, RegExp> = {
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  SSN: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
  // Common name patterns (simplified - in production use NER)
  NAME: /\b(John|Jane|Sarah|Michael|Emily|David|Jennifer|Robert|Lisa|William|Mary|James|Patricia|Christopher|Linda|Daniel|Elizabeth|Matthew|Barbara|Anthony|Susan|Mark|Jessica|Donald|Karen|Steven|Nancy|Andrew|Betty|Paul|Margaret|Joshua|Sandra|Kenneth|Ashley|Kevin|Dorothy|Brian|Kimberly|George|Donna|Edward|Michelle|Ronald|Carol|Timothy|Amanda|Jason|Melissa|Jeffrey|Deborah|Ryan|Stephanie|Jacob|Rebecca|Gary|Laura|Nicholas|Sharon|Eric|Cynthia|Jonathan|Kathleen|Stephen|Amy|Larry|Angela|Justin|Anna|Scott|Brenda|Brandon|Emma|Raymond|Virginia|Benjamin|Katherine|Samuel|Catherine|Gregory|Christine|Frank|Debra|Alexander|Rachel|Patrick|Carolyn|Jack|Janet|Dennis|Maria|Jerry|Heather|Tyler|Diane|Aaron|Ruth|Jose|Julie|Adam|Olivia|Nathan|Joyce|Henry|Victoria|Douglas|Kelly|Zachary|Lauren|Peter|Christina|Kyle|Joan|Noah|Evelyn|Ethan|Judith)\s+([A-Z][a-z]+)\b/g,
  ACCOUNT: /\b(account|acct)[#:\s]*\d{6,12}\b/gi,
  ADDRESS: /\b\d{1,5}\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\b/gi,
};

// Replacement tokens
const REDACTION_TOKENS: Record<string, string> = {
  EMAIL: '[EMAIL_REDACTED]',
  PHONE: '[PHONE_REDACTED]',
  SSN: '[SSN_REDACTED]',
  NAME: '[NAME_REDACTED]',
  ACCOUNT: '[ACCOUNT_REDACTED]',
  ADDRESS: '[ADDRESS_REDACTED]',
};

export function detectPII(text: string): PIIEntity[] {
  const entities: PIIEntity[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: type as PIIEntity['type'],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Sort by start position
  return entities.sort((a, b) => a.start - b.start);
}

export function redactPII(text: string): { redacted: string; entities: PIIEntity[] } {
  const entities = detectPII(text);
  let redacted = text;
  let offset = 0;

  for (const entity of entities) {
    const token = REDACTION_TOKENS[entity.type];
    const start = entity.start + offset;
    const end = entity.end + offset;

    redacted = redacted.slice(0, start) + token + redacted.slice(end);
    offset += token.length - (entity.end - entity.start);
  }

  return { redacted, entities };
}

export function reconstructWithPII(
  redactedResponse: string,
  originalEntities: PIIEntity[]
): string {
  let result = redactedResponse;

  // Simple reconstruction - replace tokens with original values
  for (const entity of originalEntities) {
    const token = REDACTION_TOKENS[entity.type];
    result = result.replace(token, entity.text);
  }

  return result;
}

export function createAuditEntry(
  originalText: string,
  redactedText: string,
  entities: PIIEntity[]
): PIIAuditEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    originalText,
    redactedText,
    entitiesFound: entities,
    action: entities.length > 0 ? 'REDACTED' : 'ALLOWED',
  };
}

// Highlight PII in text for visualization
export function highlightPII(text: string): string {
  const entities = detectPII(text);
  let result = text;
  let offset = 0;

  for (const entity of entities) {
    const start = entity.start + offset;
    const end = entity.end + offset;
    const highlightStart = `<mark class="pii-${entity.type.toLowerCase()}">`;
    const highlightEnd = '</mark>';

    result =
      result.slice(0, start) +
      highlightStart +
      result.slice(start, end) +
      highlightEnd +
      result.slice(end);

    offset += highlightStart.length + highlightEnd.length;
  }

  return result;
}
