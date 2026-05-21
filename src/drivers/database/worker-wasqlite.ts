import {
  DatabaseResultSet,
  QueryableBaseDriver,
} from "@/drivers/base-driver";
import { InStatement } from "@libsql/client";
import { SqliteLikeBaseDriver } from "../sqlite-base-driver";
import { WorkerResponse } from "./worker-protocol";

class WorkerQueryable implements QueryableBaseDriver {
  public hasRowsChanged: boolean = false;

  constructor(protected rpc: (req: any) => Promise<WorkerResponse>) {}

  async transaction(stmts: InStatement[]): Promise<DatabaseResultSet[]> {
    const res = await this.rpc({ type: "TRANSACTION", stmts });
    if (res.type === "TRANSACTION_RESULT") {
      if (res.error) throw new Error(res.error);
      
      const checkRes = await this.rpc({ type: "CHECK_CHANGED" });
      if (checkRes.type === "CHECK_CHANGED_RESULT") {
        this.hasRowsChanged = checkRes.hasChanged;
      }
      
      return res.results;
    }
    throw new Error("Unexpected response type");
  }

  async query(stmt: InStatement): Promise<DatabaseResultSet> {
    const res = await this.rpc({ type: "QUERY", stmt });
    if (res.type === "QUERY_RESULT") {
      if (res.error) throw new Error(res.error);
      
      const checkRes = await this.rpc({ type: "CHECK_CHANGED" });
      if (checkRes.type === "CHECK_CHANGED_RESULT") {
        this.hasRowsChanged = checkRes.hasChanged;
      }

      return res.result;
    }
    throw new Error("Unexpected response type");
  }
}

export default class WorkerSqliteDriver extends SqliteLikeBaseDriver {
  protected queryable: WorkerQueryable;
  protected rpc: (req: any) => Promise<WorkerResponse>;

  constructor(rpc: (req: any) => Promise<WorkerResponse>) {
    const queryable = new WorkerQueryable(rpc);
    super(queryable);
    
    this.rpc = rpc;
    this.queryable = queryable;
  }

  resetChange() {
    this.queryable.hasRowsChanged = false;
    this.rpc({ type: "RESET_CHANGED" });
  }

  hasChanged() {
    return this.queryable.hasRowsChanged;
  }
}
