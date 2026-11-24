export interface WeightedField {
  text: string;
  weight: number;
}

export interface CandidateScoreResult {
  score: number;
  matchedWords: string[];
}

const RECENT_SEARCHES_KEY = 'spacetabs_recent_searches';
const QUICK_RECALL_CLEARED_AT_KEY = 'spacetabs_quick_recall_cleared_at';
const QUICK_RECALL_DISMISSED_IDS_KEY = 'spacetabs_quick_recall_dismissed_ids';
const MAX_RECENT_SEARCHES = 6;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return getRecentSearches();
  try {
    const current = getRecentSearches().filter(
      (s) => s.toLowerCase() !== trimmed.toLowerCase()
    );
    const updated = [trimmed, ...current].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeRecentSearch(query: string): string[] {
  try {
    const updated = getRecentSearches().filter((s) => s !== query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {}
}

export function getQuickRecallClearedAt(): number {
  try {
    const raw = localStorage.getItem(QUICK_RECALL_CLEARED_AT_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function clearQuickRecallHistory(): number {
  const now = Date.now();
  try {
    localStorage.setItem(QUICK_RECALL_CLEARED_AT_KEY, String(now));
    localStorage.removeItem(QUICK_RECALL_DISMISSED_IDS_KEY);
  } catch {}
  return now;
}

export function getDismissedQuickRecallIds(): Set<string> {
  try {
    const raw = localStorage.getItem(QUICK_RECALL_DISMISSED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id): id is string => typeof id === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

export function dismissQuickRecallItem(itemId: string): Set<string> {
  const current = getDismissedQuickRecallIds();
  current.add(itemId);
  try {
    localStorage.setItem(
      QUICK_RECALL_DISMISSED_IDS_KEY,
      JSON.stringify(Array.from(current).slice(-100))
    );
  } catch {}
  return new Set(current);
}

/**
 * Returns semantic site-type recall keywords so forgetful/ADHD users can search
 * by concept ("sheet", "spreadsheet", "doc", "slides", "colab", "notebook", "video",
 * "ai", "chat", "repo", "pdf") even when those words are not in the item title.
 */
export function getSemanticAliases(url: string, title = ''): string {
  const lower = `${url} ${title}`.toLowerCase();
  const aliases: string[] = [];

  if (lower.includes('docs.google.com/document') || lower.includes('/document/d/')) {
    aliases.push('doc document gdoc google-doc word write paper');
  }
  if (lower.includes('docs.google.com/spreadsheets') || lower.includes('/spreadsheets/d/')) {
    aliases.push('sheet sheets spreadsheet gsheet excel table csv data');
  }
  if (lower.includes('docs.google.com/presentation') || lower.includes('/presentation/d/')) {
    aliases.push('slide slides presentation deck ppt powerpoint');
  }
  if (lower.includes('drive.google.com')) {
    aliases.push('drive gdrive cloud folder storage');
  }
  if (lower.includes('colab.research.google.com') || lower.includes('.ipynb')) {
    aliases.push('colab notebook jupyter python ipynb code ml');
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    aliases.push('youtube video watch lecture stream tutorial');
  }
  if (lower.includes('github.com') || lower.includes('gitlab.com')) {
    aliases.push('github gitlab git repo repository code pr issue');
  }
  if (
    lower.includes('gemini.google.com') ||
    lower.includes('chatgpt.com') ||
    lower.includes('openai.com') ||
    lower.includes('claude.ai') ||
    lower.includes('chat.qwen.ai') ||
    lower.includes('chat.z.ai') ||
    lower.includes('kimi.ai') ||
    lower.includes('perplexity.ai') ||
    lower.includes('deepseek.com')
  ) {
    aliases.push('ai chat chatbot llm assistant prompt bot');
  }
  if (lower.includes('reddit.com')) {
    aliases.push('reddit forum post thread community');
  }
  if (lower.includes('.pdf')) {
    aliases.push('pdf document paper book ebook');
  }

  return aliases.join(' ');
}

/**
 * Fast bounded Damerau-Levenshtein edit distance (supports adjacent transpositions like "googel" -> "google").
 * Returns maxDist + 1 if distance exceeds maxDist.
 */
function boundedDamerauLevenshtein(a: string, b: string, maxDist: number): number {
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > maxDist) return maxDist + 1;
  if (a === b) return 0;

  const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array<number>(lenB + 1).fill(0)
  );
  for (let i = 0; i <= lenA; i++) dp[i][0] = i;
  for (let j = 0; j <= lenB; j++) dp[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    let rowMin = maxDist + 1;
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + 1); // transposition
      }
      dp[i][j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
  }

  return dp[lenA][lenB];
}

function isWordBoundaryChar(ch: string | undefined): boolean {
  if (!ch) return true;
  return !/[\p{L}\p{N}]/u.test(ch);
}

/**
 * Scores a single lowercase query word against a single text field.
 * Hierarchy:
 * - 100: Exact whole-field match
 * -  85: Field starts with word
 * -  75: A whole word inside the field equals word
 * -  65: A word inside the field starts with word (prefix match)
 * -  30: In-word substring match (e.g. "one" inside "money")
 * -  18: Fuzzy typo / transposition match on a word token (for query words >= 4 chars)
 */
export function scoreWordInText(
  rawText: string,
  word: string,
  allowFuzzy = true
): { score: number; matchedToken: string | null } {
  if (!rawText || !word) return { score: 0, matchedToken: null };
  const lower = rawText.toLowerCase().trim();
  if (!lower) return { score: 0, matchedToken: null };

  if (lower === word) {
    return { score: 100, matchedToken: word };
  }

  if (lower.startsWith(word)) {
    const afterChar = lower[word.length];
    return {
      score: isWordBoundaryChar(afterChar) ? 90 : 82,
      matchedToken: word,
    };
  }

  const idx = lower.indexOf(word);
  if (idx !== -1) {
    // Check all occurrences to see if any is a whole-word or word-prefix match
    let bestSubstringScore = 28;
    let pos = idx;
    while (pos !== -1) {
      const beforeOk = isWordBoundaryChar(lower[pos - 1]);
      const afterOk = isWordBoundaryChar(lower[pos + word.length]);
      if (beforeOk && afterOk) {
        return { score: 75, matchedToken: word };
      }
      if (beforeOk) {
        bestSubstringScore = Math.max(bestSubstringScore, 65);
      }
      pos = lower.indexOf(word, pos + 1);
    }
    return { score: bestSubstringScore, matchedToken: word };
  }

  // Fuzzy typo tolerance for words >= 4 chars (ADHD / fast-typing friendly)
  if (allowFuzzy && word.length >= 4) {
    const maxDist = word.length >= 7 ? 2 : 1;
    const tokens = lower.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 3);
    for (const token of tokens) {
      // Check against token or token prefix of same length
      const dFull = boundedDamerauLevenshtein(word, token, maxDist);
      if (dFull <= maxDist) {
        return { score: dFull === 1 ? 20 : 15, matchedToken: token };
      }
      if (token.length > word.length) {
        const prefix = token.slice(0, word.length);
        const dPrefix = boundedDamerauLevenshtein(word, prefix, 1);
        if (dPrefix <= 1) {
          return { score: 16, matchedToken: prefix };
        }
      }
    }
  }

  return { score: 0, matchedToken: null };
}

/**
 * Evaluates a candidate item against all query words across weighted ownFields and contextFields.
 * Rules:
 * 1. Every query word must match at least one field (own or context).
 * 2. At least one query word must match an ownField (prevents space-name matches from flooding all items in that space).
 */
export function scoreSearchCandidate(
  words: string[],
  ownFields: WeightedField[],
  contextFields: WeightedField[] = []
): CandidateScoreResult | null {
  if (words.length === 0) return null;

  let totalScore = 0;
  let matchedOwnFieldCount = 0;
  const matchedWordsSet = new Set<string>();

  for (const word of words) {
    let bestOwnScore = 0;
    let bestOwnToken: string | null = null;

    for (const field of ownFields) {
      if (!field.text) continue;
      const { score, matchedToken } = scoreWordInText(
        field.text,
        word,
        field.weight >= 0.45 // Enable fuzzy typo check on title/domain/space, skip on raw long URLs
      );
      const weighted = score * field.weight;
      if (weighted > bestOwnScore) {
        bestOwnScore = weighted;
        bestOwnToken = matchedToken;
      }
    }

    let bestContextScore = 0;
    let bestContextToken: string | null = null;

    for (const field of contextFields) {
      if (!field.text) continue;
      const { score, matchedToken } = scoreWordInText(field.text, word, true);
      const weighted = score * field.weight;
      if (weighted > bestContextScore) {
        bestContextScore = weighted;
        bestContextToken = matchedToken;
      }
    }

    if (bestOwnScore === 0 && bestContextScore === 0) {
      // Every word in a multi-word query must match somewhere
      return null;
    }

    if (bestOwnScore > 0) {
      matchedOwnFieldCount += 1;
      totalScore += bestOwnScore + bestContextScore * 0.25;
      if (bestOwnToken) matchedWordsSet.add(bestOwnToken);
    } else {
      totalScore += bestContextScore;
      if (bestContextToken) matchedWordsSet.add(bestContextToken);
    }
  }

  // Crucial rule: at least one word must match the item's own fields!
  if (matchedOwnFieldCount === 0) {
    return null;
  }

  return {
    score: Math.round(totalScore * 10) / 10,
    matchedWords: Array.from(matchedWordsSet),
  };
}

export function extractSnippet(text: string, words: string[], maxLength = 90): string {
  if (!text) return '';
  const clean = text.replace(/[\r\n#*`_-]+/g, ' ').trim();
  if (words.length === 0) {
    return clean.slice(0, maxLength) + (clean.length > maxLength ? '...' : '');
  }

  let bestIdx = -1;
  const lower = clean.toLowerCase();
  for (const w of words) {
    const idx = lower.indexOf(w.toLowerCase());
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }

  if (bestIdx === -1 || bestIdx <= 30) {
    return clean.slice(0, maxLength) + (clean.length > maxLength ? '...' : '');
  }

  const start = Math.max(0, bestIdx - 25);
  const end = Math.min(clean.length, bestIdx + (maxLength - 25));
  return (
    (start > 0 ? '...' : '') +
    clean.slice(start, end).trim() +
    (end < clean.length ? '...' : '')
  );
}
