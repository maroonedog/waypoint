import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function summarizeProfile(profile) {
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  const parents = new Map();
  for (const node of profile.nodes) for (const child of node.children ?? []) parents.set(child, node.id);
  const totals = new Map();
  let totalUs = 0;
  for (let index = 0; index < profile.samples.length; index++) {
    const duration = profile.timeDeltas[index];
    totalUs += duration;
    let id = profile.samples[index];
    const seen = new Set();
    let leaf = true;
    while (id !== undefined) {
      const frame = nodes.get(id).callFrame;
      const name = frame.functionName || "(anonymous)";
      const key = `${name}@${frame.url}:${frame.lineNumber}`;
      if (!seen.has(key)) {
        const row = totals.get(key) ?? { name, url: frame.url, line: frame.lineNumber + 1, selfUs: 0, inclusiveUs: 0 };
        row.inclusiveUs += duration;
        if (leaf) row.selfUs += duration;
        totals.set(key, row);
        seen.add(key);
      }
      leaf = false;
      id = parents.get(id);
    }
  }
  const rows = [...totals.values()].map(row => ({
    ...row, selfPercent: +(100 * row.selfUs / totalUs).toFixed(2),
    inclusivePercent: +(100 * row.inclusiveUs / totalUs).toFixed(2),
  }));
  return {
    totalMs: totalUs / 1000, samples: profile.samples.length,
    selected: rows.filter(row => ["getCandidateSignaturesForStringLiteralCompletions", "inferTypes", "inferTypeArguments", "recursiveTypeRelatedTo", "isTypeAssignableTo", "(garbage collector)"].includes(row.name)),
    self: rows.sort((a, b) => b.selfUs - a.selfUs).slice(0, 20),
    inclusive: [...rows].sort((a, b) => b.inclusiveUs - a.inclusiveUs).slice(0, 35),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const summary = summarizeProfile(JSON.parse(readFileSync(process.argv[2], "utf8")));
  console.log(JSON.stringify(summary, null, 2));
}
