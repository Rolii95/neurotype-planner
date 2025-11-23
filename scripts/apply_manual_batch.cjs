#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fp = process.argv[2] || path.join('supabase','migrations','20251120_all_migrations_gap_fix.sql');
if (!fs.existsSync(fp)) { console.error('File not found:', fp); process.exit(2); }
const dir = path.dirname(fp);
const base = path.basename(fp);
const ts = new Date().toISOString().replace(/[:]/g,'-');
const bak = path.join(dir, base + `.manualbatch.bak-${ts}.sql`);
fs.copyFileSync(fp, bak);
console.log('Backup created:', bak);
let content = fs.readFileSync(fp, 'utf8');
const changes = [];
function replaceAllExact(searchRegex, replaceStr, description) {
  const before = content;
  content = content.replace(searchRegex, replaceStr);
  const count = (before.length - content.length) / (searchRegex.source.length || 1);
  if (before !== content) changes.push({description, replaced: true});
}
// Conservative replacements: DO $BEGIN -> DO $$ ; AS $$" -> AS $$ ; fix any literal newline-in-enum 'skipped\n' occurrences
let replacedCount = 0;
// Replace DO $BEGIN (rare) with DO $$
const doBeginRegex = /DO \$BEGIN/g;
if (doBeginRegex.test(content)) {
  content = content.replace(doBeginRegex, 'DO $$');
  changes.push({description: "DO $BEGIN -> DO $$", occurrences: (content.match(/DO \$\$/g)||[]).length});
}
// Replace AS $$" -> AS $$
const asDollarQuoteRegex = /AS \$\$"/g;
if (asDollarQuoteRegex.test(content)) {
  content = content.replace(asDollarQuoteRegex, 'AS $$');
  changes.push({description: 'AS $$" -> AS $$', occurrences: (content.match(/AS \$\$/g)||[]).length});
}
// Replace any single-quoted enum elements that contain a literal newline sequences (\n or actual newline between quotes)
// First fix explicit escape sequences '\n' inside single quotes
const escapedNewlineRegex = /'skipped\\n'/g;
if (escapedNewlineRegex.test(content)) {
  content = content.replace(escapedNewlineRegex, "'skipped'");
  changes.push({description: "'skipped\\n' -> 'skipped'", occurrences: (content.match(/'skipped'/g)||[]).length});
}
// Next, fix the case where 'skipped' may have an actual newline in the file (a quote, the word split across lines). We'll normalize any pattern like 'skipped\n' by collapsing internal newlines within enum parentheses for the specific enum name step_execution_status
// Find all CREATE TYPE step_execution_status AS ENUM blocks and remove stray newlines inside the parentheses
const enumRegex = /CREATE TYPE step_execution_status AS ENUM \(([^\)]*)\);/gs;
let m;
let enumFixes = 0;
while ((m = enumRegex.exec(content)) !== null) {
  const body = m[1];
  if (/\n/.test(body)) {
    const normalized = body.replace(/\s+/g, ' ').replace(/'\s*,\s*'/g, "','");
    const fullOld = m[0];
    const fullNew = `CREATE TYPE step_execution_status AS ENUM (${normalized});`;
    content = content.slice(0, m.index) + fullNew + content.slice(m.index + fullOld.length);
    enumFixes++;
  }
}
if (enumFixes) changes.push({description: 'Normalized multiline step_execution_status enum entries', occurrences: enumFixes});
fs.writeFileSync(fp, content, 'utf8');
console.log('Applied manual batch edits. Changes:', changes);
console.log('Wrote file:', fp);
process.exit(0);
