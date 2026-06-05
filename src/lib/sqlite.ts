import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

let sqliteConnection: SQLiteConnection | null = null;

export function getSQLiteConnection(): SQLiteConnection {
  if (!sqliteConnection) {
    sqliteConnection = new SQLiteConnection(CapacitorSQLite);
  }
  return sqliteConnection;
}

export let dbConn: SQLiteDBConnection | null = null;
const DB_NAME = 'khayatpro_db';

export async function initSQLite() {
  const connection = getSQLiteConnection();
  if (Capacitor.getPlatform() === 'web') {
    // Define the jeep-sqlite custom element dynamically for web preview
    try {
      const { defineCustomElements: jeepSqlite } = await import('jeep-sqlite/loader');
      await jeepSqlite(window);
      const jeepEl = document.createElement('jeep-sqlite');
      document.body.appendChild(jeepEl);
      await customElements.whenDefined('jeep-sqlite');
      await connection.initWebStore();
    } catch (e) {
      console.error('Failed to initialize web jeep-sqlite:', e);
    }
  }

  // Create connection
  const check = await connection.checkConnectionsConsistency();
  const isConn = (await connection.isConnection(DB_NAME, false)).result;

  if (check.result && isConn) {
    dbConn = await connection.retrieveConnection(DB_NAME, false);
  } else {
    dbConn = await connection.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  }

  await dbConn.open();
  
  // Set WAL mode BEFORE any table usage
  await dbConn.execute('PRAGMA journal_mode=WAL;', false);
  
  // Create simple Key-Value store to safely adapt our existing local DB schemas
  const query = `
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `;
  await dbConn.execute(query);
  
  return dbConn;
}

export async function sqliteGet(key: string): Promise<string | null> {
  if (!dbConn) return null;
  const res = await dbConn.query('SELECT value FROM kv_store WHERE key = ?', [key]);
  if (res.values && res.values.length > 0) {
    return res.values[0].value;
  }
  return null;
}

let writeQueue: Promise<void> = Promise.resolve();

export async function sqliteSet(key: string, value: string): Promise<void> {
  if (!dbConn) return;
  
  writeQueue = writeQueue.then(async () => {
    try {
      if (!dbConn) return;
      await dbConn.run('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', [key, value]);
      if (Capacitor.getPlatform() === 'web') {
        const connection = getSQLiteConnection();
        await connection.saveToStore(DB_NAME);
      }
    } catch (err) {
      console.error(`Error in sequential sqliteSet for key ${key}:`, err);
    }
  });

  return writeQueue;
}

export async function sqliteGetAllKeys(): Promise<string[]> {
  if (!dbConn) return [];
  const res = await dbConn.query('SELECT key FROM kv_store');
  return (res.values || []).map((row: any) => row.key);
}

export async function getSQLiteFilePath(): Promise<string> {
  return DB_NAME; // On web/android via capacitor this resolves the target file properly based on platform.
}
