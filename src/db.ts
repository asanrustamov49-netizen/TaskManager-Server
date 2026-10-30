import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { config } from "./config.js";
import type { DbSchema } from "./types.js";

let cache: DbSchema | null = null;

let writeQueue: Promise<void> = Promise.resolve();

export async function readDb(): Promise<DbSchema> {
  if (cache) return cache;

  try {
    const text = await readFile(config.dbPath, "utf8");
    cache = JSON.parse(text) as DbSchema;
  } catch (err) {
    const fileNotFound = (err as NodeJS.ErrnoException).code === "ENOENT";
    if (!fileNotFound) throw err;
    cache = { users: [], tasks: [] };
  }

  return cache;
}

export function updateDb<T>(mutate: (db: DbSchema) => T): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await readDb();
    const result = mutate(db);
    await mkdir(dirname(config.dbPath), { recursive: true });
    const tmpPath = `${config.dbPath}.tmp`;
    await writeFile(tmpPath, JSON.stringify(db, null, 2));
    await rename(tmpPath, config.dbPath);

    return result;
  });

  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}
