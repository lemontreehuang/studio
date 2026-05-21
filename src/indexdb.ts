import Dexie, { EntityTable } from "dexie";
import { SavedConnectionRawLocalStorage } from "./app/(theme)/connect/saved-connection-storage";
import { DashboardProps } from "./components/board";

export interface LocalDashboardData extends DashboardProps {
  id: string;
  created_at: number;
  updated_at: number;
}
interface IndexDbNamespace {
  id: string;
  database_id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

interface IndexDbDoc {
  id: string;
  database_id: string;
  namespace_id: string;
  name: string;
  type: string;
  content: string;
  created_at: number;
  updated_at: number;
}

interface IndexDbFileHandler {
  id: string;
  handler: FileSystemFileHandle;
}

interface IndexDbBoard {
  id: string;
  content: LocalDashboardData;
}

/**
 * A Local-First workspace entry stored in IndexedDB.
 * Each workspace corresponds to one SQLite database permanently stored in OPFS.
 */
export interface Workspace {
  /** UUID — also used as the OPFS filename (avoids same-name conflicts) */
  id: string;
  /** Human-readable display name (defaults to original filename) */
  name: string;
  /** SHA-256 hash of the original file content (used for conflict detection) */
  hash: string;
  /** File size in bytes */
  size: number;
  /** Saved FileSystemFileHandle for "sync back to external file" feature */
  fileHandle?: FileSystemFileHandle;
  /** ISO timestamp of creation */
  createdAt: number;
  /** ISO timestamp of last modification inside WebSQLite */
  lastModified: number;
}

export interface LocalConnectionData {
  id: string;
  content: SavedConnectionRawLocalStorage;
  created_at: number;
  updated_at: number;
}

const localDb = new Dexie("libstudio") as Dexie & {
  namespace: EntityTable<IndexDbNamespace, "id">;
  saved_doc: EntityTable<IndexDbDoc, "id">;
  file_handler: EntityTable<IndexDbFileHandler, "id">;
  board: EntityTable<IndexDbBoard, "id">;
  connection: EntityTable<LocalConnectionData, "id">;
  workspaces: EntityTable<Workspace, "id">;
};

localDb.version(4).stores({
  namespace: "++id, database_id",
  saved_doc: "++id, database_id, namespace_id",
  file_handler: "++id, handler",
  board: "++id",
  connection: "++id",
});

// Version 5: Local-First workspace registry
localDb.version(5).stores({
  namespace: "++id, database_id",
  saved_doc: "++id, database_id, namespace_id",
  file_handler: "++id, handler",
  board: "++id",
  connection: "++id",
  workspaces: "id, name, hash, createdAt, lastModified",
});

export { localDb };
