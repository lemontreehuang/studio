"use client";
/**
 * Workspace section for the Local Dashboard.
 * Displays all OPFS-backed workspaces and handles import/create flows.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Database,
  FilePlus2,
  FolderOpen,
  Trash2,
  Pencil,
  Upload,
  Check,
  X,
} from "lucide-react";
import {
  getAllWorkspaces,
  importWorkspace,
  createBlankWorkspace,
  deleteWorkspace,
  renameWorkspace,
  overwriteWorkspace,
} from "@/lib/workspace-storage";
import { Workspace } from "@/indexdb";

const SQLITE_EXTENSIONS = ".db,.sdb,.sqlite,.db3,.s3db,.sqlite3,.sl3";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "空白";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

interface ConflictState {
  existing: Workspace;
  name: string;
  buffer: ArrayBuffer;
  fileHandle?: FileSystemFileHandle;
}

export default function WorkspaceSection() {
  const router = useRouter();
  const { t } = useTranslation();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllWorkspaces();
      setWorkspaces(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ──────────────── Import logic ────────────────

  const handleImportBuffer = useCallback(
    async (name: string, buffer: ArrayBuffer, fileHandle?: FileSystemFileHandle) => {
      const result = await importWorkspace(name, buffer, fileHandle);

      if ("conflict" in result) {
        setConflict({ existing: result.conflict, name, buffer, fileHandle });
        return;
      }

      if (result.isExisting) {
        toast.info(t("workspace.alreadyExists", "已存在相同文件，直接打开。"));
      } else {
        toast.success(t("workspace.imported", "数据库已导入工作区"));
      }
      await refresh();
      router.push(`/playground/client?id=${result.workspace.id}`);
    },
    [refresh, router, t]
  );

  const onImportFile = useCallback(async () => {
    if (window.showOpenFilePicker) {
      try {
        const [fh] = await window.showOpenFilePicker({
          types: [
            {
              description: "SQLite Files",
              accept: { "application/x-sqlite3": SQLITE_EXTENSIONS.split(",") as `.${string}`[] },
            },
          ],
        });
        const file = await fh.getFile();
        const buffer = await file.arrayBuffer();
        await handleImportBuffer(file.name, buffer, fh);
      } catch (err: any) {
        if (err?.name !== "AbortError") toast.error("导入失败");
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [handleImportBuffer]);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      await handleImportBuffer(file.name, buffer);
    },
    [handleImportBuffer]
  );

  const onFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      await handleImportBuffer(file.name, buffer);
      e.target.value = "";
    },
    [handleImportBuffer]
  );

  // ──────────────── Conflict resolution ────────────────

  const resolveOverwrite = useCallback(async () => {
    if (!conflict) return;
    await overwriteWorkspace(conflict.existing.id, conflict.buffer, conflict.fileHandle);
    toast.success(t("workspace.overwritten", "已覆盖原有工作区"));
    setConflict(null);
    await refresh();
    router.push(`/playground/client?id=${conflict.existing.id}`);
  }, [conflict, refresh, router, t]);

  const resolveKeepBoth = useCallback(async () => {
    if (!conflict) return;
    const baseName = conflict.name.replace(/(\.[^.]+)$/, "");
    const ext = conflict.name.match(/(\.[^.]+)$/)?.[1] ?? ".db";
    const newName = `${baseName} (副本)${ext}`;
    const result = await importWorkspace(newName, conflict.buffer, conflict.fileHandle);
    if ("workspace" in result) {
      toast.success(t("workspace.savedAsCopy", "已另存为副本"));
      setConflict(null);
      await refresh();
      router.push(`/playground/client?id=${result.workspace.id}`);
    }
  }, [conflict, refresh, router, t]);

  // ──────────────── CRUD actions ────────────────

  const onCreateBlank = useCallback(async () => {
    const name = `新数据库 ${new Date().toLocaleDateString("zh-CN")}`;
    const ws = await createBlankWorkspace(name);
    toast.success(t("workspace.created", "已创建新数据库"));
    await refresh();
    router.push(`/playground/client?id=${ws.id}`);
  }, [refresh, router, t]);

  const onDelete = useCallback(
    async (ws: Workspace) => {
      if (!confirm(t("workspace.confirmDelete", `确定要删除「${ws.name}」吗？此操作不可撤销。`))) return;
      await deleteWorkspace(ws.id);
      toast.success(t("workspace.deleted", "已删除"));
      await refresh();
    },
    [refresh, t]
  );

  const startEdit = useCallback((ws: Workspace) => {
    setEditingId(ws.id);
    setEditName(ws.name);
  }, []);

  const commitEdit = useCallback(
    async (id: string) => {
      if (editName.trim()) {
        await renameWorkspace(id, editName.trim());
        await refresh();
      }
      setEditingId(null);
    },
    [editName, refresh]
  );

  // ──────────────── Render ────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t("workspace.title", "SQLite 本地工作区")}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onCreateBlank}
            className="flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            {t("workspace.newBlank", "新建")}
          </button>
          <button
            onClick={onImportFile}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            {t("workspace.import", "导入文件")}
          </button>
        </div>
      </div>

      {/* Hidden file input fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SQLITE_EXTENSIONS}
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* Conflict dialog */}
      {conflict && (
        <div className="rounded-lg border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
            ⚠️ 已存在同名工作区「{conflict.name}」，但内容不同
          </p>
          <div className="flex gap-2">
            <button
              onClick={resolveOverwrite}
              className="rounded bg-yellow-600 px-3 py-1.5 text-sm text-white hover:bg-yellow-700"
            >
              覆盖原有
            </button>
            <button
              onClick={resolveKeepBoth}
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              另存为副本
            </button>
            <button
              onClick={() => setConflict(null)}
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Drop zone + workspace list */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="min-h-[120px] rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-1 transition-colors hover:border-blue-400"
      >
        {loading ? (
          <div className="flex h-24 items-center justify-center text-sm text-gray-400">
            加载中…
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex h-24 flex-col items-center justify-center gap-2 text-sm text-gray-400">
            <FolderOpen className="h-8 w-8 opacity-40" />
            <span>{t("workspace.empty", "拖入 .db 文件即可导入，或点击「导入文件」按钮")}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                onClick={() => router.push(`/playground/client?id=${ws.id}`)}
                className="group relative flex cursor-pointer items-center gap-3 rounded-md p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Database className="h-8 w-8 flex-shrink-0 text-blue-500" />
                <div className="flex-1 min-w-0">
                  {editingId === ws.id ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(ws.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 rounded border px-1 py-0.5 text-sm bg-white dark:bg-gray-900 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button onClick={() => commitEdit(ws.id)} className="text-green-600 hover:text-green-700">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="truncate text-sm font-medium">{ws.name}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {formatBytes(ws.size)} · {formatRelativeTime(ws.lastModified)}
                    {ws.fileHandle && (
                      <span className="ml-1 text-blue-400" title="已关联外部文件">🔗</span>
                    )}
                  </p>
                </div>
                {/* Action buttons — only shown on hover */}
                <div
                  className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    title="重命名"
                    onClick={() => startEdit(ws)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title="删除"
                    onClick={() => onDelete(ws)}
                    className="rounded p-1 text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
