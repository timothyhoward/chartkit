import type {
  QueryDefinition,
  DataSourceDefinition,
} from "./definitions";

const TABLE_REFERENCE_PATTERN =
  /\b(?:from|join)\s+((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][A-Za-z0-9_]*)(?:\s*\.\s*(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][A-Za-z0-9_]*))?)/gi;

function stripSqlNoise(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n\r]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''");
}

function unquoteIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizeTableReference(reference: string): string {
  const segments = reference.split(".").map((segment) => unquoteIdentifier(segment));
  return segments[segments.length - 1];
}

function extractSqlTableReferences(sql: string): Set<string> {
  const cleanedSql = stripSqlNoise(sql);
  const references = new Set<string>();
  let match: RegExpExecArray | null = null;
  while ((match = TABLE_REFERENCE_PATTERN.exec(cleanedSql)) !== null) {
    const rawReference = match[1];
    if (!rawReference) {
      continue;
    }
    references.add(normalizeTableReference(rawReference));
  }
  return references;
}

export function hashSqlTemplate(sql: string): string {
  let hash = 5381;
  for (let index = 0; index < sql.length; index += 1) {
    hash = ((hash << 5) + hash) ^ sql.charCodeAt(index);
  }
  return `${hash >>> 0}`;
}

export function resolveQueryDataSourceDependencies(
  query: QueryDefinition,
  sql: string,
  dataSources: DataSourceDefinition[],
): string[] {
  const dataSourceIds = new Set(dataSources.map((source) => source.id));
  const autoDetected = Array.from(extractSqlTableReferences(sql)).filter((ref) =>
    dataSourceIds.has(ref),
  );

  const effective = new Set<string>(autoDetected);
  for (const dependencyId of query.dependsOn ?? []) {
    if (dataSourceIds.has(dependencyId)) {
      effective.add(dependencyId);
    }
  }
  for (const excludedId of query.excludeDependsOn ?? []) {
    effective.delete(excludedId);
  }

  return Array.from(effective).sort((left, right) => left.localeCompare(right));
}
