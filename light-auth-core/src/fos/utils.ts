import { Dirent, existsSync, promises as fsPromises } from "node:fs";
import { resolve, dirname } from "node:path";

// Ignores ENOENT (file not found) and EISDIR (is a directory) errors, returns null for those.
function ignoreNotfound(err: any) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}

// Ignores EEXIST (file already exists) errors, returns null for those.
function ignoreExists(err: any) {
  return err.code === "EEXIST" ? null : err;
}

type WriteFileData = Parameters<typeof fsPromises.writeFile>[1];

/**
 * Writes data to a file, ensuring the directory exists before writing.
 * @param path - The file path to write to.
 * @param data - The data to write.
 * @param encoding - Optional encoding for the file.
 */
export async function writeFile(path: string, data: WriteFileData, encoding?: BufferEncoding) {
  await ensuredir(dirname(path));
  return fsPromises.writeFile(path, data, encoding);
}

/**
 * Reads a file and returns its contents, or null if the file does not exist.
 * @param path - The file path to read from.
 * @param encoding - Optional encoding for the file.
 */
export function readFile(path: string, encoding?: BufferEncoding) {
  return fsPromises.readFile(path, encoding).catch(ignoreNotfound);
}

/**
 * Gets file or directory statistics, or null if the path does not exist.
 * @param path - The file or directory path.
 */
export function stat(path: string) {
  return fsPromises.stat(path).catch(ignoreNotfound);
}

/**
 * Deletes a file, ignoring errors if the file does not exist.
 * @param path - The file path to delete.
 */
export function unlink(path: string) {
  return fsPromises.unlink(path).catch(ignoreNotfound);
}

/**
 * Reads the contents of a directory and returns an array of Dirent objects.
 * Returns an empty array if the directory does not exist.
 * @param dir - The directory path.
 */
export function readdir(dir: string): Promise<Dirent[]> {
  return fsPromises
    .readdir(dir, { withFileTypes: true })
    .catch(ignoreNotfound)
    .then((r) => r || []);
}

/**
 * Ensures that a directory exists, creating it and its parent directories if necessary.
 * @param dir - The directory path to ensure.
 */
export async function ensuredir(dir: string) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname(dir)).catch(ignoreExists);
  await fsPromises.mkdir(dir).catch(ignoreExists);
}

/**
 * Recursively reads all files in a directory, optionally ignoring some files or limiting depth.
 * @param dir - The directory path.
 * @param ignore - Optional function to ignore certain paths.
 * @param maxDepth - Optional maximum recursion depth.
 * @returns An array of file paths relative to the input directory.
 */
export async function readdirRecursive(dir: string, ignore?: (p: string) => boolean, maxDepth?: number) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries: Dirent[] = await readdir(dir);
  const files: string[] = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === undefined || maxDepth > 0) {
          const dirFiles = await readdirRecursive(entryPath, ignore, maxDepth === undefined ? undefined : maxDepth - 1);
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}

/**
 * Recursively removes a directory and all its contents.
 * @param dir - The directory path to remove.
 */
export async function rmRecursive(dir: string) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => fsPromises.rmdir(entryPath));
      } else {
        return fsPromises.unlink(entryPath);
      }
    })
  );
}

export function normalizeKey(key: string | undefined, sep: ":" | "/" = ":"): string {
  if (!key) {
    return "";
  }
  return key.replace(/[:/\\]/g, sep).replace(/^[:/\\]|[:/\\]$/g, "");
}

export function joinKeys(...keys: string[]) {
  return keys
    .map((key) => normalizeKey(key))
    .filter(Boolean)
    .join(":");
}

export function createError(driver: string, message: string, opts?: ErrorOptions) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}

export function createRequiredError(driver: string, name: string | string[]) {
  if (Array.isArray(name)) {
    return createError(driver, `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`);
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}
