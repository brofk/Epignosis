import type {RecordItem} from './defaults';

type ContentDatabase = Pick<D1Database, 'prepare'>;
type SettingRow = {key: string; value: string; version: number};

export interface PublicContentRepository {
  settings(): Promise<SettingRow[]>;
  publishedRecords(): Promise<RecordItem[]>;
  savedSeedIds(ids: readonly string[]): Promise<string[]>;
}

export interface EditorContentRepository {
  records(): Promise<RecordItem[]>;
}

function recordFromRow(row: Record<string, unknown>): RecordItem {
  return {
    id: String(row.id),
    kind: row.kind as RecordItem['kind'],
    title: String(row.title),
    slug: String(row.slug),
    status: row.status as RecordItem['status'],
    data: JSON.parse(String(row.data)),
    updatedAt: String(row.updated_at),
    version: Number(row.version),
  };
}

// Create these inside the request. The binding is injected, never kept globally.
// Repositories perform reads only; editor authorization stays at the route boundary.
export function createPublicContentRepository(database: ContentDatabase): PublicContentRepository {
  return {
    async settings() {
      const rows = await database.prepare('SELECT key,value,version FROM settings')
        .all<SettingRow>();
      return rows.results;
    },
    async publishedRecords() {
      const rows = await database.prepare("SELECT * FROM records WHERE status='published' ORDER BY updated_at DESC")
        .all<Record<string, unknown>>();
      return rows.results.map(recordFromRow);
    },
    async savedSeedIds(ids) {
      if (!ids.length) return [];
      // A saved draft suppresses its seed without fetching any draft body.
      const rows = await database.prepare('SELECT id FROM records WHERE id IN (SELECT value FROM json_each(?))')
        .bind(JSON.stringify(ids)).all<{id: string}>();
      return rows.results.map(row => row.id);
    },
  };
}

export function createEditorContentRepository(database: ContentDatabase): EditorContentRepository {
  return {
    async records() {
      const rows = await database.prepare('SELECT * FROM records ORDER BY updated_at DESC')
        .all<Record<string, unknown>>();
      return rows.results.map(recordFromRow);
    },
  };
}
