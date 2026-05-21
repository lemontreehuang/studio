import { DatabaseResultSet } from "@/drivers/base-driver";
import { InStatement } from "@libsql/client";

export type WorkerRequest =
  | {
      type: "INIT_DB";
      dbName: string;
      buffer?: ArrayBuffer;
      useOPFS: boolean;
      msgId: string;
    }
  | {
      type: "QUERY";
      stmt: InStatement;
      msgId: string;
    }
  | {
      type: "TRANSACTION";
      stmts: InStatement[];
      msgId: string;
    }
  | {
      type: "EXPORT";
      msgId: string;
    }
  | {
      type: "CHECK_CHANGED";
      msgId: string;
    }
  | {
      type: "RESET_CHANGED";
      msgId: string;
    };

export type WorkerResponse =
  | {
      type: "INIT_DONE";
      msgId: string;
      success: boolean;
      error?: string;
    }
  | {
      type: "QUERY_RESULT";
      msgId: string;
      result: DatabaseResultSet;
      error?: string;
    }
  | {
      type: "TRANSACTION_RESULT";
      msgId: string;
      results: DatabaseResultSet[];
      error?: string;
    }
  | {
      type: "EXPORT_RESULT";
      msgId: string;
      buffer: ArrayBuffer;
      error?: string;
    }
  | {
      type: "CHECK_CHANGED_RESULT";
      msgId: string;
      hasChanged: boolean;
    }
  | {
      type: "RESET_CHANGED_DONE";
      msgId: string;
    };
