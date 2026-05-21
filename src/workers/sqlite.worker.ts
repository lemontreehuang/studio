import * as SQLite from "wa-sqlite";
import SQLiteESMFactory from "wa-sqlite/dist/wa-sqlite.mjs";
import { MemoryVFS } from "wa-sqlite/src/examples/MemoryVFS.js";
// @ts-ignore
import { AccessHandlePoolVFS } from "wa-sqlite/src/examples/AccessHandlePoolVFS.js";
import { WorkerRequest, WorkerResponse } from "@/drivers/database/worker-protocol";
import { DatabaseHeader, DatabaseResultSet, DatabaseRow } from "@/drivers/base-driver";
import { InStatement } from "@libsql/client";

let sqlite3: SQLiteAPI | null = null;
let currentDb: number | null = null;
let currentDbName: string = "db";
let currentVFS: any = null;
let vfsName: string = "";
let hasRowsChanged = false;

// Map wa-sqlite column type constants to type name strings
const SQLITE_TYPE_MAP: Record<number, string> = {
  [SQLite.SQLITE_INTEGER]: 'INTEGER',
  [SQLite.SQLITE_FLOAT]: 'REAL',
  [SQLite.SQLITE_TEXT]: 'TEXT',
  [SQLite.SQLITE_BLOB]: 'BLOB',
  [SQLite.SQLITE_NULL]: 'NULL',
};

// Helpers to map JS values to/from SQLite
async function executeQuery(stmt: InStatement): Promise<DatabaseResultSet> {
  if (!sqlite3 || currentDb === null) throw new Error("Database not initialized");

  const sql = typeof stmt === "string" ? stmt : stmt.sql;
  const bind = typeof stmt === "string" ? undefined : stmt.args;

  const startTime = Date.now();
  const headers: DatabaseHeader[] = [];
  const rows: DatabaseRow[] = [];
  
  let rowsAffected = 0;

  for await (const stmtPtr of sqlite3.statements(currentDb, sql)) {
    if (bind) {
      if (Array.isArray(bind)) {
        for (let i = 0; i < bind.length; i++) {
          sqlite3.bind(stmtPtr, i + 1, bind[i] as any);
        }
      } else {
        const paramCount = sqlite3.bind_parameter_count(stmtPtr);
        for (let idx = 1; idx <= paramCount; idx++) {
          const name = sqlite3.bind_parameter_name(stmtPtr, idx);
          if (name) {
            const key = name.replace(/^[:@$]/, '');
            if (key in bind) {
              sqlite3.bind(stmtPtr, idx, (bind as any)[key]);
            } else if (name in bind) {
              sqlite3.bind(stmtPtr, idx, (bind as any)[name]);
            }
          }
        }
      }
    }

    let isFirst = true;
    while ((await sqlite3.step(stmtPtr)) === SQLite.SQLITE_ROW) {
      if (isFirst) {
        const colCount = sqlite3.column_count(stmtPtr);
        const headerSet = new Set();

        for (let i = 0; i < colCount; i++) {
          const colName = sqlite3.column_name(stmtPtr, i);
          let renameColName = colName;

          for (let j = 0; j < 20; j++) {
            if (!headerSet.has(renameColName)) break;
            renameColName = `__${colName}_${j}`;
          }
          
          headerSet.add(renameColName);

          // Use column_type() to get the dynamic storage type of this column
          const colTypeId = sqlite3.column_type(stmtPtr, i);
          const colTypeName = SQLITE_TYPE_MAP[colTypeId] ?? null;

          headers.push({
            name: renameColName,
            displayName: colName,
            originalType: colTypeName,
            type: undefined,
          });
        }
        isFirst = false;
      }

      const row: DatabaseRow = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i].name] = sqlite3.column(stmtPtr, i);
      }
      rows.push(row);
    }
  }

  const endTime = Date.now();
  rowsAffected = sqlite3.changes(currentDb);

  if (rowsAffected > 0) {
    hasRowsChanged = true;
  } else {
    // sqlite3.changes() only tracks INSERT, UPDATE, DELETE.
    // We must manually flag schema changes (DDL) as having changed the database.
    // Use a broad word-boundary match to handle multi-statement input,
    // leading comments, and additional DDL keywords.
    const sqlString = typeof stmt === "string" ? stmt : stmt.sql;
    if (/\b(CREATE|DROP|ALTER|VACUUM|REINDEX|ANALYZE)\b/i.test(sqlString)) {
      hasRowsChanged = true;
    }
  }

  return {
    headers,
    rows,
    stat: {
      rowsAffected: headers.length === 0 ? rowsAffected : 0,
      rowsRead: null,
      rowsWritten: null,
      queryDurationMs: endTime - startTime,
    },
  };
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;

  try {
    if (req.type === "INIT_DB") {
      if (!sqlite3) {
        const wasmModule = await SQLiteESMFactory({
          locateFile: (file: string) => self.location.origin + `/${file}`,
        });
        sqlite3 = SQLite.Factory(wasmModule);
      }

      if (currentDb !== null) {
        try { await sqlite3.close(currentDb); } catch(_err) { /* ignore close errors */ }
      }

      let VFSClass: any = MemoryVFS;
      vfsName = "memory-vfs";

      if (req.useOPFS) {
        try {
          // Check if OPFS is available
          if (navigator.storage && typeof navigator.storage.getDirectory === 'function') {
            // AccessHandlePoolVFS is sync-compatible and uses OPFS.
            VFSClass = AccessHandlePoolVFS;
            vfsName = "opfs-vfs";
          } else {
            console.warn("OPFS not supported, falling back to MemoryVFS");
          }
        } catch (err) {
          console.warn("Error checking OPFS, falling back to MemoryVFS", err);
        }
      }

      let justCreated = false;
      // Only initialize VFS if not already initialized or if we are switching VFS types
      if (!currentVFS || currentVFS.name !== (vfsName === "opfs-vfs" ? "AccessHandlePool" : "memory")) {
        currentVFS = new VFSClass(vfsName);
        justCreated = true;
      }

      if (currentVFS.isReady) {
        await currentVFS.isReady;
      }

      if (justCreated) {
        sqlite3.vfs_register(currentVFS, true);
      }

      currentDbName = req.dbName || "db";

      if (req.buffer) {
        const dbName = currentDbName;
        // The VFS might not have a direct mapNameToFile if it's OPFS.
        // We write the buffer directly to the VFS.
        if (vfsName === "memory-vfs") {
          currentVFS.mapNameToFile.set(dbName, {
            name: dbName,
            flags: SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_READWRITE,
            size: req.buffer.byteLength,
            data: req.buffer,
          });
        } else {
          // Clean up any previous OPFS file with the same name to prevent data residue
          // when switching databases (e.g., opening a new file after editing a previous one).
          if (typeof currentVFS.xDelete === 'function') {
            try { currentVFS.xDelete(dbName, 1); } catch { /* file may not exist yet */ }
          }

          // Use VFS API to inject the file
          const dummyFileId = 0x12345678;
          const pOutFlags = new DataView(new ArrayBuffer(4));
          const flags = SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_MAIN_DB | SQLite.SQLITE_OPEN_READWRITE;
          
          let capturedError = "";
          const origConsoleError = console.error;
          console.error = (msg: any) => { capturedError = msg; };
          
          // Before trying to open, let's just make sure we have capacity
          if (vfsName === "opfs-vfs" && typeof currentVFS.getSize === 'function' && typeof currentVFS.getCapacity === 'function') {
            if (currentVFS.getSize() >= currentVFS.getCapacity()) {
              if (typeof currentVFS.addCapacity === 'function') {
                await currentVFS.addCapacity(1);
              }
            }
          }

          const resOpen = currentVFS.xOpen(dbName, dummyFileId, flags, pOutFlags);
          console.error = origConsoleError;

          if (resOpen === SQLite.SQLITE_OK) {
            currentVFS.xTruncate(dummyFileId, req.buffer.byteLength);
            currentVFS.xWrite(dummyFileId, new Uint8Array(req.buffer), 0);
            currentVFS.xClose(dummyFileId);
          } else {
            throw new Error(`Failed to open OPFS VFS file to write buffer. Reason: ${capturedError}`);
          }
        }
      }

      currentDb = await sqlite3.open_v2(currentDbName);
      hasRowsChanged = false;

      const res: WorkerResponse = { type: "INIT_DONE", msgId: req.msgId, success: true };
      self.postMessage(res);
    } 
    else if (req.type === "QUERY") {
      const result = await executeQuery(req.stmt);
      const res: WorkerResponse = { type: "QUERY_RESULT", msgId: req.msgId, result };
      self.postMessage(res);
    }
    else if (req.type === "TRANSACTION") {
      const results = [];
      // Wrap in BEGIN/COMMIT for atomicity; ROLLBACK on failure
      await executeQuery("BEGIN TRANSACTION");
      try {
        for (const stmt of req.stmts) {
          results.push(await executeQuery(stmt));
        }
        await executeQuery("COMMIT");
      } catch (txErr) {
        try { await executeQuery("ROLLBACK"); } catch { /* ignore rollback error */ }
        throw txErr;
      }
      const res: WorkerResponse = { type: "TRANSACTION_RESULT", msgId: req.msgId, results };
      self.postMessage(res);
    }
    else if (req.type === "EXPORT") {
      if (!sqlite3 || currentDb === null || !currentVFS) {
        throw new Error("Database not initialized");
      }

      let exportBuffer: ArrayBuffer;

      if (vfsName === "memory-vfs") {
        const file = currentVFS.mapNameToFile.get(currentDbName);
        if (file) {
          exportBuffer = file.data.slice(0, file.size);
        } else {
          exportBuffer = new ArrayBuffer(0);
        }
      } else {
        // Read directly from VFS
        // Close first to flush WAL journal and release file locks, then read, then reopen.
        // Set currentDb to null to guard against concurrent message handling.
        await sqlite3.close(currentDb);
        currentDb = null;
        
        const dummyFileId = 0x87654321;
        const pOutFlags = new DataView(new ArrayBuffer(4));
        const flags = SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_MAIN_DB;
        
        const resOpen = currentVFS.xOpen(currentDbName, dummyFileId, flags, pOutFlags);
        if (resOpen === SQLite.SQLITE_OK) {
          const pSize64 = new DataView(new ArrayBuffer(8));
          currentVFS.xFileSize(dummyFileId, pSize64);
          const size = Number(pSize64.getBigInt64(0, true));
          
          const buffer = new Uint8Array(size);
          currentVFS.xRead(dummyFileId, buffer, 0);
          exportBuffer = buffer.buffer;
          
          currentVFS.xClose(dummyFileId);
        } else {
          throw new Error("Failed to open OPFS VFS file for export");
        }
        
        currentDb = await sqlite3.open_v2(currentDbName);
      }
      
      const res: WorkerResponse = { type: "EXPORT_RESULT", msgId: req.msgId, buffer: exportBuffer };
      self.postMessage(res, [res.buffer]);
    }
    else if (req.type === "CHECK_CHANGED") {
      const res: WorkerResponse = { type: "CHECK_CHANGED_RESULT", msgId: req.msgId, hasChanged: hasRowsChanged };
      self.postMessage(res);
    }
    else if (req.type === "RESET_CHANGED") {
      hasRowsChanged = false;
      const res: WorkerResponse = { type: "RESET_CHANGED_DONE", msgId: req.msgId };
      self.postMessage(res);
    }
  } catch (error: any) {
    if (req.type === "INIT_DB") {
      self.postMessage({ type: "INIT_DONE", msgId: req.msgId, success: false, error: error.message });
    } else if (req.type === "QUERY") {
      self.postMessage({ type: "QUERY_RESULT", msgId: req.msgId, error: error.message, result: { headers: [], rows: [], stat: { rowsAffected: 0, queryDurationMs: 0 } as any } });
    } else if (req.type === "TRANSACTION") {
      self.postMessage({ type: "TRANSACTION_RESULT", msgId: req.msgId, error: error.message, results: [] });
    } else if (req.type === "EXPORT") {
      self.postMessage({ type: "EXPORT_RESULT", msgId: req.msgId, error: error.message, buffer: new ArrayBuffer(0) });
    }
  }
};
