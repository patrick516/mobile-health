// Fuzzy match — checks if two village names are likely the same place
// Uses Levenshtein distance normalised to a similarity score 0-1

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function similarityScore(a, b) {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(s1, s2) / maxLen;
}

// Returns true if two village names are likely duplicates (>= 80% similar)
export function areLikelyDuplicates(name1, name2, threshold = 0.8) {
  return similarityScore(name1, name2) >= threshold;
}

// Given a new village name and a list of existing villages in the same zone,
// returns any existing villages that look like duplicates
export function findPotentialDuplicates(newName, existingVillages) {
  return existingVillages.filter((v) => areLikelyDuplicates(newName, v.name));
}
