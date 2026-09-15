import { readGeminiLogEntries, computeGeminiLogAggregates, isValidLogDate } from '../geminiLog';

const arg = process.argv[2];
const date = arg && isValidLogDate(arg) ? arg : new Date().toISOString().slice(0, 10);

const entries = readGeminiLogEntries({ date });
if (entries.length === 0) {
  console.log(`No Gemini log entries for ${date} (logs/gemini-${date}.jsonl).`);
  process.exit(0);
}

const agg = computeGeminiLogAggregates(entries);
console.log(`\n=== Gemini DF-AI log analysis: ${date} (${agg.totalCycles} cycles) ===\n`);
console.log('Source split :', agg.bySource);
console.log('Error rate   :', (agg.errorRate * 100).toFixed(1) + '%');
console.log('Latency      :', `avg ${agg.latency.avg}ms | p50 ${agg.latency.p50}ms | p95 ${agg.latency.p95}ms`);
console.log('Status dist  :', agg.statusDistribution);
console.log('Avg cmds/cyc :', Object.fromEntries(
  Object.entries(agg.avgCommandsPerCycle).map(([k, v]) => [k, (v as number).toFixed(2)]),
));
console.log('Top directives:');
for (const d of agg.topDirectives) console.log(`  ${d.count}x  ${d.directive}`);
console.log('');
