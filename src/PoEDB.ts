import { Kysely, SqliteDialect } from "kysely";
import { Exporter, Loaders } from "poe-dat-export";
import Database from "better-sqlite3";
import Debug from "debug";
import path from "path";

import * as pathUtils from "./utils/paths";
import { Language, Schema } from "./models";
import { SQLITE_VAR_LIMIT } from "./models/Constants";

export class PoEDB extends Kysely<Schema.DB> {
  protected readonly _debug: Debug.Debugger;
  protected readonly _exporter: Exporter.DatExporter;
  protected readonly _sqliteDb: Database.Database;
  protected readonly _dbPath: string;
  protected readonly _cacheDir: string | undefined;
  protected readonly _cacheDuration: number | undefined;

  /**
   * @param dbPath The location of the sqlite db. If the path is relative,
   * it will be resolved using the cwd
   *
   * @param cacheDir The directory used for caching. If the path is relative,
   * it will be resolved using the cwd. If not specified, the default will be used
   */
  constructor(dbPath?: string, cacheDir?: string, cacheDuration?: number) {
    let _dbPath = dbPath || pathUtils.defaultDbPath();
    if (!path.isAbsolute(_dbPath)) _dbPath = path.resolve(_dbPath);

    const db = new Database(_dbPath);
    super({
      dialect: new SqliteDialect({
        database: db,
      }),
    });

    this._sqliteDb = db;
    this._dbPath = _dbPath;
    this._cacheDir = cacheDir;
    this._cacheDuration = cacheDuration;

    if (this._cacheDir && !path.isAbsolute(this._cacheDir))
      this._cacheDir = path.resolve(this._cacheDir);

    this._debug = Debug(`exile-db:`).extend(this.constructor.name);

    this._debug(`Loaded DB from %s`, this.DbPath);

    const bundlerOptions: Loaders.OnlineBundleLoaderOptions = {
      cacheFile: true,
    };
    if (this.CacheDir) bundlerOptions.cacheDir = this.CacheDir;
    if (this.CacheDuration) bundlerOptions.cacheDuration = this.CacheDuration;

    this._exporter = new Exporter.DatExporter({
      bundleLoader: new Loaders.OnlineBundleLoader(bundlerOptions),
    });
  }

  /**
   * The path to the sqlite database
   */
  public get DbPath(): string {
    return this._dbPath;
  }

  /**
   * The absolute path to the cache directory
   */
  public get CacheDir(): string | undefined {
    return this._cacheDir;
  }

  /**
   * The time in ms items stay in cache
   */
  public get CacheDuration(): number | undefined {
    return this._cacheDuration;
  }

  /**
   * Tries to load the data of the given table into the database
   *
   * @remarks Some tables cannot be exported because the decompression process fails.
   * Unfortunately, there's currently no fix for this.
   *
   * @remarks Booleans are stored as text: 'true' & 'false'
   *
   * @remarks Arrays and objects are stored in JSON format
   *
   *
   * @param table The name of the table
   * @param languages The languages in which the table will be loaded
   * @param ignoreDuplicateError If set, insertion of existing rows does not throw an error
   */
  public async tryLoadTable(
    table: keyof Schema.DB,
    languages: Array<Language> = [Language.English],
    ignoreDuplicateError = true
  ) {
    try {
      this._debug(`Loading table %s in languages %O`, table, languages);

      for (const lang of languages) {
        const data = await this._exporter.export(table, lang);

        this._debug(`Loaded %d values for table %s`, data.length, table);

        this._preprocessData(data, lang);

        await this._insertData(data, table, ignoreDuplicateError);
      }
    } catch (error) {
      this._debug(`Error while loading table %s: %O`, table, error);
      throw error;
    }
  }

  protected async _insertData(
    data: Exporter.ExportResult[],
    table: keyof Schema.DB,
    ignoreDuplicateError: boolean
  ) {
    // do insertion in batches, otherwise the sql variable limit might be exceeded
    const keySize = Object.keys(data?.[0] || {}).length;
    const batchSize = Math.floor(SQLITE_VAR_LIMIT / keySize);
    const batches = Math.ceil(data.length / batchSize);

    for (let index = 0; index < batches; index++) {
      const batch = data.slice(index * batchSize, (index + 1) * batchSize);
      let query = this.insertInto(table).values(batch);
      if (ignoreDuplicateError)
        query = query.onConflict((oc) => oc.doNothing());
      await query.execute();
    }

    this._debug(`Inserted %d values into table %s`, data.length, table);
  }

  /**
   * Preprocesses the data before insertion.
   * This is especially necessary for non-sqlite datatypes, e.g. boolean, arrays & objects
   *
   * @remarks Entries in `data` are changed
   */
  protected _preprocessData(data: Exporter.ExportResult[], language: Language) {
    data.forEach((entry) => {
      entry["Language"] = language;

      Object.keys(entry).forEach((key) => {
        // booleans & objects are not supported in sqlite
        if (typeof entry[key] == "boolean" || typeof entry[key] == "object") {
          entry[key] = JSON.stringify(entry[key]);
        }
      });
    });
  }
}
