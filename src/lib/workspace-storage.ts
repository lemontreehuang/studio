/**
 * workspace-storage.ts
 *
 * Utility functions for managing Local-First OPFS workspaces.
 * Each workspace is a SQLite database permanently stored in the browser's
 * Origin Private File System (OPFS) and registered in IndexedDB.
 */

import { localDb, Workspace } from "@/indexdb";

/** Generate a UUID-like ID */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Compute the SHA-256 hash of an ArrayBuffer.
 * Used for conflict detection when the user imports a file with the same name.
 */
export async function computeHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Import a database into the Local-First workspace.
 *
 * Conflict rules (by same name):
 *   - Same hash  → return existing workspace (idempotent, no duplicate)
 *   - Diff hash  → return null, let caller handle the conflict prompt
 *
 * @returns The created/existing Workspace, or null if a name conflict exists
 *          with different content (caller must resolve).
 */
export async function importWorkspace(
  name: string,
  buffer: ArrayBuffer,
  fileHandle?: FileSystemFileHandle
): Promise<{ workspace: Workspace; isExisting: boolean } | { conflict: Workspace }> {
  const hash = await computeHash(buffer);
  const size = buffer.byteLength;

  // Check for existing workspace with same name
  const existing = await localDb.workspaces
    .where("name")
    .equals(name)
    .first();

  if (existing) {
    if (existing.hash === hash) {
      // Exact same file — return idempotently
      return { workspace: existing, isExisting: true };
    } else {
      // Same name, different content → conflict
      return { conflict: existing };
    }
  }

  // Write data into OPFS
  const id = generateId();
  await writeToOPFS(id, buffer);

  const workspace: Workspace = {
    id,
    name,
    hash,
    size,
    fileHandle,
    createdAt: Date.now(),
    lastModified: Date.now(),
  };

  await localDb.workspaces.add(workspace);
  return { workspace, isExisting: false };
}

/**
 * Overwrite an existing workspace with new file content.
 * Used when the user resolves a name conflict by choosing "overwrite".
 */
export async function overwriteWorkspace(
  existingId: string,
  buffer: ArrayBuffer,
  fileHandle?: FileSystemFileHandle
): Promise<Workspace> {
  const hash = await computeHash(buffer);
  const size = buffer.byteLength;

  await writeToOPFS(existingId, buffer);

  const updates: Partial<Workspace> = {
    hash,
    size,
    lastModified: Date.now(),
    fileHandle: fileHandle ?? undefined,
  };

  await localDb.workspaces.update(existingId, updates);
  return (await localDb.workspaces.get(existingId))!;
}

/**
 * Create a new blank (empty) workspace.
 */
export async function createBlankWorkspace(name: string): Promise<Workspace> {
  const id = generateId();
  const emptyBuffer = new ArrayBuffer(0);
  await writeToOPFS(id, emptyBuffer);

  const hash = await computeHash(emptyBuffer);

  const workspace: Workspace = {
    id,
    name,
    hash,
    size: 0,
    createdAt: Date.now(),
    lastModified: Date.now(),
  };

  await localDb.workspaces.add(workspace);
  return workspace;
}

/**
 * Get all workspaces, sorted by lastModified descending.
 */
export async function getAllWorkspaces(): Promise<Workspace[]> {
  const all = await localDb.workspaces.toArray();
  return all.sort((a, b) => b.lastModified - a.lastModified);
}

/**
 * Get a single workspace by ID.
 */
export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  return localDb.workspaces.get(id);
}

/**
 * Update the lastModified timestamp of a workspace (call after any DB mutation).
 */
export async function touchWorkspace(id: string): Promise<void> {
  await localDb.workspaces.update(id, { lastModified: Date.now() });
}

/**
 * Delete a workspace and its OPFS data.
 */
export async function deleteWorkspace(id: string): Promise<void> {
  await deleteFromOPFS(id);
  await localDb.workspaces.delete(id);
}

/**
 * Rename a workspace.
 */
export async function renameWorkspace(id: string, newName: string): Promise<void> {
  await localDb.workspaces.update(id, { name: newName });
}

// ─────────────────────────────────────────────────────────
// OPFS helpers (main thread, used only during import/delete)
// ─────────────────────────────────────────────────────────

async function getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory();
}

/**
 * Write a database buffer to OPFS using the workspace UUID as the filename.
 * NOTE: We use a writable stream here (main thread) to initialise the file.
 * The Worker will subsequently open a SyncAccessHandle for read/write.
 */
export async function writeToOPFS(id: string, buffer: ArrayBuffer): Promise<void> {
  const root = await getOpfsRoot();
  const fileHandle = await root.getFileHandle(id, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(buffer);
  await writable.close();
}

/**
 * Read the raw bytes of a workspace from OPFS (e.g., for export).
 */
export async function readFromOPFS(id: string): Promise<ArrayBuffer> {
  const root = await getOpfsRoot();
  const fileHandle = await root.getFileHandle(id);
  const file = await fileHandle.getFile();
  return file.arrayBuffer();
}

async function deleteFromOPFS(id: string): Promise<void> {
  try {
    const root = await getOpfsRoot();
    await root.removeEntry(id);
  } catch {
    // File may not exist if workspace was never properly initialized
  }
}
