import {
  DatabaseHeader,
  DatabaseResultSet,
  DatabaseRow,
  QueryableBaseDriver,
} from "@/drivers/base-driver";
import { InStatement } from "@libsql/client";
import * as SQLite from "wa-sqlite";
import { SqliteLikeBaseDriver } from "../sqlite-base-driver";

class WaSqliteQueryable implements QueryableBaseDriver {
  public hasRowsChanged: boolean = false;

  constructor(
    protected sqlite3: SQLiteAPI,
    protected db: number
  ) {}

  async transaction(stmts: InStatement[]): Promise<DatabaseResultSet[]> {
    const r: DatabaseResultSet[] = [];

    // Assuming we don't strictly need BEGIN/COMMIT here since it's just batch execution,
    // but the `base-driver` interface implies sequential execution.
    for (const s of stmts) {
      r.push(await this.query(s));
    }

    return r;
  }

  async query(stmt: InStatement): Promise<DatabaseResultSet> {
    const sql = typeof stmt === "string" ? stmt : stmt.sql;
    const bind = typeof stmt === "string" ? undefined : stmt.args;

    const startTime = Date.now();

    // Do the transform result here
    const headers: DatabaseHeader[] = [];
    const rows: DatabaseRow[] = [];
    
    const changesBefore = this.sqlite3.changes(this.db);
    let rowsAffected = 0;

    for await (const stmtPtr of this.sqlite3.statements(this.db, sql)) {
      if (bind) {
        if (Array.isArray(bind)) {
          for (let i = 0; i < bind.length; i++) {
            // wa-sqlite bindings are 1-indexed
            this.sqlite3.bind(stmtPtr, i + 1, bind[i] as any);
          }
        } else {
          // Object binding
          const paramCount = this.sqlite3.bind_parameter_count(stmtPtr);
          for (let idx = 1; idx <= paramCount; idx++) {
            const name = this.sqlite3.bind_parameter_name(stmtPtr, idx);
            if (name) {
              const key = name.replace(/^[:@$]/, '');
              if (key in bind) {
                this.sqlite3.bind(stmtPtr, idx, (bind as any)[key]);
              } else if (name in bind) {
                this.sqlite3.bind(stmtPtr, idx, (bind as any)[name]);
              }
            }
          }
        }
      }

      let isFirst = true;
      while ((await this.sqlite3.step(stmtPtr)) === SQLite.SQLITE_ROW) {
        if (isFirst) {
          const colCount = this.sqlite3.column_count(stmtPtr);
          const headerSet = new Set();

          for (let i = 0; i < colCount; i++) {
            const colName = this.sqlite3.column_name(stmtPtr, i);
            let renameColName = colName;

            for (let j = 0; j < 20; j++) {
              if (!headerSet.has(renameColName)) break;
              renameColName = `__${colName}_${j}`;
            }
            
            headerSet.add(renameColName);

            headers.push({
              name: renameColName,
              displayName: colName,
              originalType: null,
              type: undefined,
            });
          }
          isFirst = false;
        }

        const row: DatabaseRow = {};
        for (let i = 0; i < headers.length; i++) {
          row[headers[i].name] = this.sqlite3.column(stmtPtr, i);
        }
        rows.push(row);
      }
    }

    const endTime = Date.now();
    rowsAffected = this.sqlite3.changes(this.db);

    if (rowsAffected > 0) {
      this.hasRowsChanged = true;
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
}

export default class WaSqliteDriver extends SqliteLikeBaseDriver {
  protected queryable: WaSqliteQueryable;
  protected sqlite3: SQLiteAPI;
  protected db: number;

  constructor(sqlite3: SQLiteAPI, db: number) {
    const queryable = new WaSqliteQueryable(sqlite3, db);
    super(queryable);
    
    this.sqlite3 = sqlite3;
    this.db = db;
    this.queryable = queryable;
  }

  reload(sqlite3: SQLiteAPI, db: number) {
    this.sqlite3 = sqlite3;
    this.db = db;
    this.queryable = new WaSqliteQueryable(sqlite3, db);
    this._db = this.queryable;
  }

  resetChange() {
    this.queryable.hasRowsChanged = false;
  }

  hasChanged() {
    return this.queryable.hasRowsChanged;
  }
}
