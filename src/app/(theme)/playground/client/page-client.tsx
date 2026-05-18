"use client";
import { Studio } from "@/components/gui/studio";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
} from "@/components/gui/toolbar";
import ScreenDropZone from "@/components/screen-dropzone";
import { StudioExtensionManager } from "@/core/extension-manager";
import { createSQLiteExtensions } from "@/core/standard-extension";
import SqljsDriver from "@/drivers/database/sqljs";
import { localDb } from "@/indexdb";
import { useAvailableAIAgents } from "@/lib/ai-agent-storage";
import downloadFileFromUrl from "@/lib/download-file";
import { saveAs } from "file-saver";
import {
  FolderOpenIcon,
  LucideFile,
  LucideLoader,
  RefreshCcw,
  Save,
  Pin,
  PinOff,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { generateId } from "@/lib/generate-id";
import { createLocalConnection, removeLocalConnection } from "@/app/(outerbase)/local/hooks";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Database, SqlJsStatic } from "sql.js";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

function useWebLock(lockName: string | undefined) {
  const [lockError, setLockError] = useState(false);

  useEffect(() => {
    if (!lockName) {
      setLockError(false);
      return;
    }

    let isMounted = true;
    let releaseLock: (() => void) | undefined;

    const promise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    if (typeof navigator !== "undefined" && navigator.locks) {
      navigator.locks.request(lockName, { mode: "exclusive", ifAvailable: true }, async (lock) => {
        if (!isMounted) {
          if (releaseLock) releaseLock();
          return;
        }
        
        if (!lock) {
          setLockError(true);
          return;
        }
        
        setLockError(false);
        // Wait forever until unmounted
        await promise;
      }).catch(console.error);
    }

    return () => {
      isMounted = false;
      if (releaseLock) {
        releaseLock();
      }
    };
  }, [lockName]);

  return lockError;
}

const SQLITE_FILE_EXTENSIONS =
  ".db,.sdb,.sqlite,.db3,.s3db,.sqlite3,.sl3,.db2,.s2db,.sqlite2,.sl2";

export default function PlaygroundEditorBody({
  preloadDatabase,
}: {
  preloadDatabase?: string | null;
}) {
  const [sqlInit, setSqlInit] = useState<SqlJsStatic>();
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const pinToDashboard = useCallback(async (fileHandler: FileSystemFileHandle) => {
    try {
      const id = generateId();
      await localDb.file_handler.add({ id, handler: fileHandler });
      const connection = await createLocalConnection({
        name: fileHandler.name,
        driver: "sqlite-filehandler",
        file_handler: id,
        label: "blue",
      });
      setIsPinned(true);
      setConnectionId(connection.id);
      toast.success(t("playground.pinnedSuccess", "已添加到主页列表"));
    } catch (e) {
      console.error(e);
      toast.error(t("playground.pinFailed", "添加失败"));
    }
  }, [t]);

  const unpinFromDashboard = useCallback(async () => {
    const targetId = connectionId || searchParams.get("s");
    if (!targetId) return;
    try {
      const conn = await localDb.connection.get(targetId);
      if (conn && conn.content.file_handler) {
        await localDb.file_handler.delete(conn.content.file_handler);
      }
      await removeLocalConnection(targetId);
      setIsPinned(false);
      setConnectionId(null);
      toast.success(t("playground.unpinnedSuccess", "已从主页列表移除"));
    } catch (e) {
      console.error(e);
      toast.error(t("playground.unpinFailed", "取消固定失败"));
    }
  }, [connectionId, searchParams, t]);
  const [databaseLoading, setDatabaseLoading] = useState(!!preloadDatabase);

  const [nativeDriver, setNativeDriver] = useState<Database>();
  const [driver, setDriver] = useState<SqljsDriver>();

  const [handler, setHandler] = useState<FileSystemFileHandle>();
  const [fileName, setFilename] = useState("");
  const [pendingPermissionHandler, setPendingPermissionHandler] =
    useState<FileSystemFileHandle>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const agentDriver = useAvailableAIAgents(driver);

  const lockName = useMemo(() => {
    const s = searchParams.get("s");
    if (s) return `sqlite-session-${s}`;
    if (fileName) return `sqlite-file-${fileName}`;
    return undefined;
  }, [searchParams, fileName]);

  const lockError = useWebLock(lockName);

  useEffect(() => {
    if (!driver) return;
    const timer = setInterval(() => {
      const changed = driver.hasChanged();
      if (changed !== hasUnsavedChanges) {
        setHasUnsavedChanges(changed);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [driver, hasUnsavedChanges]);

  /**
   * Initialize the SQL.js library.
   */
  const onReady = useCallback(() => {
    window
      .initSqlJs({
        locateFile: (file) => `/sqljs/${file}`,
      })
      .then(setSqlInit);
  }, []);

  /**
   * Load the database from the buffer.
   */
  const loadDatabaseFromBuffer = useCallback(
    (buffer: ArrayBuffer) => {
      if (sqlInit) {
        const sqljsDatabase = new sqlInit.Database(new Uint8Array(buffer));
        setNativeDriver(sqljsDatabase);
        setDriver(new SqljsDriver(sqljsDatabase));
      }
    },
    [sqlInit]
  );

  /**
   * Load the database from the file.
   */
  const loadDatabaseFromFile = useCallback(
    (file: File) => {
      setFilename(file.name);
      file.arrayBuffer().then(loadDatabaseFromBuffer);
    },
    [loadDatabaseFromBuffer]
  );

  /*
   * Load the database from the file handler.
   */
  const loadDatabaseFromFileHandler = useCallback(
    (fileHandler: FileSystemFileHandle) => {
      fileHandler.getFile().then(loadDatabaseFromFile);
    },
    [loadDatabaseFromFile]
  );

  /**
   * Load the database when file handler changed
   */
  useEffect(() => {
    if (handler) {
      loadDatabaseFromFileHandler(handler);
    }
  }, [handler, loadDatabaseFromFileHandler]);

  /**
   * Callback when a file is dropped on the screen.
   */
  const onFileDrop = useCallback(
    (file?: File, fileHandler?: FileSystemFileHandle) => {
      if (driver && driver.hasChanged()) {
        if (!confirm(t("playground.unsavedWarning", "您有未保存的更改。打开新文件将丢失当前修改。确定要继续吗？"))) {
          return;
        }
      }

      if (file) {
        loadDatabaseFromFile(file);
        setHandler(undefined);
        setIsPinned(false);
        setConnectionId(null);
      } else if (fileHandler) {
        setHandler(fileHandler);
        setIsPinned(false);
        setConnectionId(null);
      }
    },
    [loadDatabaseFromFile, driver, t]
  );

  /**
   * Trying to initial the database from preloadDatabase or session id.
   * If no database source provided, we will create a new empty database.
   */
  useEffect(() => {
    if (sqlInit) {
      if (preloadDatabase) {
        downloadFileFromUrl(preloadDatabase)
          .then(loadDatabaseFromBuffer)
          .finally(() => setDatabaseLoading(false));
      } else if (searchParams.get("s")) {
        const sessionId = searchParams.get("s");
        if (!sessionId) return;

        loadDatabaseFileHandlerFromSessionId(sessionId).then((result) => {
          if (!result) return;
          if (result.needsPermission) {
            // Permission must be requested via user gesture — show a prompt button.
            setPendingPermissionHandler(result.handler);
          } else {
            setHandler(result.handler);
            setIsPinned(true);
            setConnectionId(sessionId);
          }
        });
      } else {
        // If no database is provided, we will create a new empty database.
        const sqljsDatabase = new sqlInit.Database();
        setNativeDriver(sqljsDatabase);
        setDriver(new SqljsDriver(sqljsDatabase));
      }
    }
  }, [sqlInit, preloadDatabase, searchParams, loadDatabaseFromBuffer]);

  /**
   * Reload the database from the file handler.
   */
  const onReloadDatabase = useCallback(() => {
    if (driver && driver.hasChanged()) {
      if (
        !confirm(
        "您有未保存的更改。刷新将丢失所有修改。确定要刷新吗？"
        )
      ) {
        return;
      }
    }

    if (handler) loadDatabaseFromFileHandler(handler);
  }, [loadDatabaseFromFileHandler, handler, driver]);

  /**
   * Ask for confirmation before closing the tab if there are changes.
   */
  useEffect(() => {
    if (driver) {
      const onBeforeClose = (e: Event) => {
        if (driver.hasChanged()) {
          e.preventDefault();
          return "Are you sure you want to close without change?";
        }
      };

      window.addEventListener("beforeunload", onBeforeClose);
      return () => window.removeEventListener("beforeunload", onBeforeClose);
    }
  }, [driver]);

  /**
   * Open the file picker to select the SQLite file.
   * Prioritize the new File System API if available.
   * If not, fallback to the traditional file input.
   */
  const onOpenClicked = useCallback(() => {
    if (driver && driver.hasChanged()) {
      if (!confirm(t("playground.unsavedWarning", "您有未保存的更改。打开新文件将丢失当前修改。确定要继续吗？"))) {
        return;
      }
    }

    if (window.showOpenFilePicker) {
      window
        .showOpenFilePicker({
          types: [
            {
              description: "SQLite Files",
              accept: {
                "application/x-sqlite3": SQLITE_FILE_EXTENSIONS.split(",") as
                  | `.${string}`
                  | `.${string}`[],
              },
            },
          ],
        })
        .then(([fileHandler]) => {
          setHandler(fileHandler);
          setIsPinned(false);
          setConnectionId(null);
        });
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = SQLITE_FILE_EXTENSIONS;
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          loadDatabaseFromFile(file);
          setHandler(undefined);
          setIsPinned(false);
          setConnectionId(null);
        }
      };

      input.click();
    }
  }, [loadDatabaseFromFile, driver, t]);

  /**
   * Save the database back to the file. Prioritize the new File System API if available.
   * If not, fallback to the traditional file download.
   */
  const performSave = useCallback(
    async (silent = false) => {
      if (!nativeDriver) return;

      if (handler) {
        try {
          const writable = await handler.createWritable();
          await writable.write(nativeDriver.export());
          await writable.close();
          
          if (!silent) {
            toast.success(
              <div>
                {t("playground.savedSuccess", "保存成功：")} <strong>{fileName}</strong>
              </div>
            );
          }
          driver?.resetChange();
          setHasUnsavedChanges(false);
        } catch (err) {
          console.error(err);
          if (!silent) toast.error("Failed to save file.");
        }
      } else {
        if (silent) return; // Do not auto-download

        // Try to use modern File System Access API
        if (window.showSaveFilePicker) {
          try {
            const newHandle = await window.showSaveFilePicker({
              suggestedName: fileName || "sqlite-dump.db",
              types: [
                {
                  description: "SQLite Database",
                  accept: { "application/x-sqlite3": [".sqlite", ".db"] },
                },
              ],
            });
            const writable = await newHandle.createWritable();
            await writable.write(nativeDriver.export());
            await writable.close();
            
            setHandler(newHandle);
            setFilename(newHandle.name);
            setIsPinned(false);
            setConnectionId(null);
            
            toast.success(
              <div>
                {t("playground.savedSuccess", "保存成功：")} <strong>{newHandle.name}</strong>
              </div>
            );
            driver?.resetChange();
            setHasUnsavedChanges(false);

            // Option D: Prompt to add to dashboard
            if (confirm(t("playground.promptPinToDashboard", "文件已保存。是否将此数据库添加到主页列表以便日后快速访问？"))) {
              pinToDashboard(newHandle);
            }
            
            return;
          } catch (err: any) {
            // User cancelled the picker or other error
            if (err.name !== 'AbortError') {
              console.error(err);
              toast.error("Failed to save file.");
            }
            return;
          }
        }

        // Fallback to traditional download if API is not supported
        saveAs(
          new Blob([nativeDriver.export()], {
            type: "application/x-sqlite3",
          }),
          "sqlite-dump.db"
        );
      }
    },
    [driver, fileName, handler, nativeDriver, t, pinToDashboard]
  );

  const onSaveClicked = useCallback(() => {
    if (driver && !driver.hasChanged()) {
      toast.info(t("playground.noChangesToSave", "没有需要保存的更改"));
      return;
    }
    performSave(false);
  }, [performSave, driver, t]);

  useEffect(() => {
    if (!autoSaveEnabled || !handler || !driver) return;

    const timer = setInterval(() => {
      if (driver.hasChanged()) {
        performSave(true);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [autoSaveEnabled, handler, driver, performSave]);

  const extensions = useMemo(() => {
    return new StudioExtensionManager(createSQLiteExtensions());
  }, []);

  /**
   * Called when the user clicks "Grant Access" after a session restore.
   * requestPermission() must run inside a user-gesture (click) handler.
   */
  const onGrantPermission = useCallback(async () => {
    if (!pendingPermissionHandler) return;
    try {
      const result = await pendingPermissionHandler.requestPermission({
        mode: "readwrite",
      });
      if (result === "granted") {
        setHandler(pendingPermissionHandler);
        setPendingPermissionHandler(undefined);
      } else {
        toast.error(t("playground.permissionDenied"));
      }
    } catch (e) {
      console.error(e);
      toast.error(t("playground.permissionDenied"));
    }
  }, [pendingPermissionHandler, t]);

  const dom = useMemo(() => {
    if (lockError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
          <LucideFile className="h-12 w-12 text-red-500" />
          <h1 className="text-2xl font-bold">
            {t("playground.fileInUse", "文件已被其他窗口占用")}
          </h1>
          <p className="max-w-md text-center text-sm text-gray-500">
            {t("playground.fileInUseDesc", "该数据库已在另一个标签页或窗口中打开。为了防止数据冲突和丢失，同一时间只能在一个窗口中操作。请先关闭另一个窗口。")}
          </p>
          <button
            onClick={() => {
              if (typeof BroadcastChannel !== "undefined") {
                const bc = new BroadcastChannel("sqlite-lock-channel");
                bc.postMessage("WAKE_UP_" + lockName);
                bc.close();
              }
              window.location.href = "/local";
            }}
            className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
          >
            {t("playground.pingAndReturn", "呼叫原窗口并返回主页")}
          </button>
        </div>
      );
    }

    if (pendingPermissionHandler) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
          <LucideFile className="h-12 w-12 text-yellow-500" />
          <h1 className="text-2xl font-bold">
            {t("playground.permissionRequired")}
          </h1>
          <p className="text-center text-sm text-gray-500">
            {t("playground.permissionRequiredDescription")}
          </p>
          <button
            onClick={onGrantPermission}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {t("playground.grantAccess")}
          </button>
        </div>
      );
    }

    if (databaseLoading) {
      return (
        <div className="p-4">
          <LucideLoader className="mb-2 h-12 w-12 animate-spin" />
          <h1 className="mb-2 text-2xl font-bold">{t("playground.loadingDatabase")}</h1>
          <p>
            {t("playground.pleaseWait")}
            <br />
            <strong>{preloadDatabase}</strong>
          </p>
        </div>
      );
    }

    if (driver) {
      return (
        <Studio
          extensions={extensions}
          color="gray"
          name="Playground"
          driver={driver}
          onBack={() => {
            if (driver && driver.hasChanged()) {
              if (!confirm("您有未保存的更改。返回工作区将丢失所有修改。确定要返回吗？")) {
                return;
              }
            }
            window.location.href = "/local";
          }}
          containerClassName="w-full h-full"
          agentDriver={agentDriver}
        />
      );
    }

    return <div></div>;
  }, [
    lockError,
    databaseLoading,
    preloadDatabase,
    driver,
    extensions,
    agentDriver,
    pendingPermissionHandler,
    onGrantPermission,
    t,
    lockName,
  ]);

  useEffect(() => {
    if (lockError || !lockName || typeof BroadcastChannel === "undefined") return;

    const bc = new BroadcastChannel("sqlite-lock-channel");
    let blinkInterval: ReturnType<typeof setInterval> | null = null;
    let cachedTitle = document.title;
    let isCurrentlyBlinking = false;

    bc.onmessage = (event) => {
      if (event.data === "WAKE_UP_" + lockName) {
        if (blinkInterval) clearInterval(blinkInterval);
        
        if (!isCurrentlyBlinking) {
          cachedTitle = document.title;
          isCurrentlyBlinking = true;
        }
        
        let isBlinking = false;
        const startTime = Date.now();
        
        blinkInterval = setInterval(() => {
          if (Date.now() - startTime > 8000) {
            if (blinkInterval) clearInterval(blinkInterval);
            document.title = cachedTitle;
            isCurrentlyBlinking = false;
            return;
          }
          isBlinking = !isBlinking;
          document.title = isBlinking ? "【请看这里！】" : cachedTitle;
        }, 500);
      }
    };

    return () => {
      bc.close();
      if (blinkInterval) {
        clearInterval(blinkInterval);
        document.title = cachedTitle;
      }
    };
  }, [lockError, lockName]);

  return (
    <>
      <Script src="/sqljs/sql-wasm.js" onReady={onReady} />
      <ScreenDropZone onFileDrop={onFileDrop} />
      <div className="flex h-screen w-screen flex-col">
        <div className="border-b p-1">
          <Toolbar>
            {fileName && (
              <div className="flex items-center gap-1 rounded bg-yellow-300 p-2 text-xs text-black">
                <LucideFile className="h-4 w-4" />
                <span>
                  {t("playground.editing")} <strong>{fileName}</strong>
                </span>
              </div>
            )}

            {driver && (
              <ToolbarButton
                text={t("common.save")}
                onClick={onSaveClicked}
                disabled={!hasUnsavedChanges}
                icon={<Save className="h-4 w-4" />}
              />
            )}

            <ToolbarButton
              text={t("playground.open")}
              onClick={onOpenClicked}
              icon={<FolderOpenIcon className="h-4 w-4" />}
            />

            {handler && (
              <>
                <ToolbarSeparator />
                {isPinned ? (
                  <ToolbarButton
                    text={t("playground.unpinFromDashboard", "已固定到主页")}
                    icon={<PinOff className="h-4 w-4 text-blue-500 fill-blue-500 dark:text-blue-400 dark:fill-blue-400" />}
                    onClick={unpinFromDashboard}
                  />
                ) : (
                  <ToolbarButton
                    text={t("playground.pinToDashboard", "固定到主页")}
                    icon={<Pin className="h-4 w-4" />}
                    onClick={() => pinToDashboard(handler)}
                  />
                )}
                <div className="flex items-center space-x-2 px-2 text-sm text-gray-700 dark:text-gray-300">
                  <Checkbox 
                    id="auto-save" 
                    checked={autoSaveEnabled} 
                    onCheckedChange={(checked) => setAutoSaveEnabled(!!checked)} 
                  />
                  <Label htmlFor="auto-save" className="cursor-pointer">
                    {t("playground.autoSave", "自动保存")}
                  </Label>
                </div>
                <ToolbarSeparator />
                <ToolbarButton
                  text={t("common.refresh")}
                  icon={<RefreshCcw className="h-4 w-4" />}
                  onClick={onReloadDatabase}
                />
              </>
            )}
          </Toolbar>
        </div>
        <div className="flex-1 overflow-hidden">{dom}</div>
      </div>
    </>
  );
}

/**
 * Returns the file handler from the session id if it exists. Otherwise, it will return undefined.
 * NOTE: This function intentionally does NOT call requestPermission() because that requires a
 * user gesture. Instead it returns a { handler, needsPermission } object so the caller can
 * prompt the user at the right time.
 *
 * @param sessionId
 */
async function loadDatabaseFileHandlerFromSessionId(
  sessionId: string
): Promise<
  | { handler: FileSystemFileHandle; needsPermission: boolean }
  | undefined
> {
  const session = await localDb.connection.get(sessionId);
  if (!session) return;

  const fileHandlerId = session?.content?.file_handler;
  if (!fileHandlerId) return;

  const sessionData = await localDb.file_handler.get(fileHandlerId);
  if (sessionData?.handler) {
    const permission = await sessionData.handler.queryPermission({ mode: "readwrite" });
    return {
      handler: sessionData.handler,
      needsPermission: permission !== "granted",
    };
  }
}
