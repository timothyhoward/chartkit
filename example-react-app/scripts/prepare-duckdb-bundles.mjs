import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants } from "node:zlib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");
const outputDir = join(projectRoot, "public", "duckdb");
const duckdbDistCandidates = [
  join(projectRoot, "node_modules", "@duckdb", "duckdb-wasm", "dist"),
  join(projectRoot, "..", "chartkit", "node_modules", "@duckdb", "duckdb-wasm", "dist"),
];

const duckdbDistDir = duckdbDistCandidates.find((candidate) =>
  existsSync(join(candidate, "duckdb-mvp.wasm")),
);

if (!duckdbDistDir) {
  throw new Error(
    `Could not locate duckdb-wasm dist directory. Checked: ${duckdbDistCandidates.join(", ")}`,
  );
}

const files = [
  "duckdb-mvp.wasm",
  "duckdb-eh.wasm",
  "duckdb-browser-mvp.worker.js",
  "duckdb-browser-eh.worker.js",
];

mkdirSync(outputDir, { recursive: true });

function isUpToDate(sourcePath, outputPath) {
  if (!existsSync(outputPath)) return false;
  return statSync(sourcePath).mtimeMs <= statSync(outputPath).mtimeMs;
}

for (const fileName of files) {
  const sourcePath = join(duckdbDistDir, fileName);
  const outputPath = join(outputDir, fileName);

  if (isUpToDate(sourcePath, outputPath)) {
    console.log(`up to date: ${fileName}`);
    continue;
  }

  copyFileSync(sourcePath, outputPath);
  console.log(`copied: ${fileName}`);

  if (fileName.endsWith(".wasm")) {
    const brOutputPath = `${outputPath}.br`;
    if (!isUpToDate(sourcePath, brOutputPath)) {
      const source = readFileSync(outputPath);
      const compressed = brotliCompressSync(source, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11,
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_GENERIC,
        },
      });
      writeFileSync(brOutputPath, compressed);
      const saved = source.length - compressed.length;
      const ratio = source.length === 0 ? 0 : ((saved / source.length) * 100).toFixed(1);
      console.log(`brotli: ${fileName}.br (${ratio}% smaller)`);
    }
  }
}

console.log(`DuckDB bundles prepared in: ${outputDir}`);
