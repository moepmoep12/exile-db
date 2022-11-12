/**
 * This script is run for every new patch because the schema might change.
 * The script creates the database tables (without data!) and is not meant to be used by
 * users of this library.
 *
 * @remarks Foreign-key constraints are not added, because tables are filled
 * dynamically by the user which might cause cascading constraint violation.
 * Furthermore, some tables are not present because they contain no valid columns
 * or exporting their data is not supported.
 */

import { config } from "dotenv";
config();
import axios from "axios";
import { Kysely, SqliteDialect } from "kysely";
import { Cli } from "kysely-codegen";
import Database from "better-sqlite3";
import Debug from "debug";
import fs from "fs";
import path from "path";
import {
  SchemaFile,
  SchemaTable,
  SCHEMA_URL,
  TableColumn,
} from "pathofexile-dat-schema";

import * as pathUtils from "../src/utils/paths";
import { PoEDB } from "../src/PoEDB";
import { ExportResult } from "poe-dat-export/dist/exporter";
import { Schema, Language } from "../src/models";

async function generateTsInterface(debug: Debug.Debugger, dbPath: string) {
  debug(`Generating TS interface from db`);
  const interfacePath = pathUtils.DbInterfacePath();
  const cli = new Cli();
  await cli.run([
    `--out-file=${interfacePath}`,
    `--url=${dbPath}`,
    `--dialect=sqlite`,
  ]);
  debug(`Generated db interface at %s`, interfacePath);
}

/**
 * Builds the initial database by creating the tables
 */
class DbBuilder {
  private readonly _dbPath: string;
  private readonly _db: Kysely<unknown>;
  private readonly _debug: Debug.Debugger;
  private _errors: Record<string, { error: unknown }> = {};
  private _schema: Readonly<SchemaFile>;

  constructor() {
    this._dbPath = pathUtils.defaultDbPath();
    this._debug = Debug(`exile-db:`).extend(this.constructor.name);

    this._db = new Kysely<unknown>({
      dialect: new SqliteDialect({
        database: new Database(this._dbPath),
      }),
    });
  }

  public get DbPath(): string {
    return this._dbPath;
  }

  public async buildDatabase() {
    this._debug("Building database at %s", this._dbPath);

    this._schema = await this._loadSchema();
    if (!this._schema) throw new Error("Error loading latest schema");
    this._debug(
      "Schema version %s loaded successfully with %d tables",
      this._schema.version,
      this._schema.tables.length
    );

    this._debug("Creating DB tables from schema");

    await Promise.all(
      this._schema.tables.map((table) =>
        this._createTable(table).catch((err) => {
          this._errors[table.name] = {
            error: (err as Error).message,
          };
          this._debug(
            "Failed to create table %s with error: %O",
            table.name,
            (err as { code: string })?.code == "SQLITE_ERROR"
              ? err
              : (err as Error).message
          );
        })
      )
    );

    await generateTsInterface(this._debug, this._dbPath);

    const filePath = path.join(__dirname, "../docs/buildErrors.json");
    this._debug(`Saving build errors to %s`, filePath);
    fs.writeFileSync(filePath, JSON.stringify(this._errors, null, 2), {
      flag: "w",
    });
  }

  private async _loadSchema(): Promise<SchemaFile> {
    this._debug("Loading latest Schema");
    const response = await axios({
      url: SCHEMA_URL,
      responseType: "json",
    });

    return response.data as SchemaFile;
  }

  private async _createTable(table: Readonly<SchemaTable>) {
    const hasValidColumns = table.columns.some((c) => c.name);
    if (!hasValidColumns) {
      throw new Error(
        `Schema of table ${table.name} contains no valid columns`
      );
    }

    const primaryKeys = ["Language", "_index"];
    let builder = this._db.schema.createTable(table.name).ifNotExists();

    builder = builder
      .addColumn("_index", "integer")
      .addColumn("Language", "varchar(30)");

    for (const column of table.columns) {
      if (column.name == null) continue;
      if (column.unique) primaryKeys.push(column.name);

      const columnType = this._getDataType(column);
      if (!columnType) {
        throw new Error(
          `Failed to get datatype for column ${JSON.stringify(
            column
          )} in table ${table.name}`
        );
      }

      builder = builder.addColumn(column.name, columnType);
    }

    builder = builder.addPrimaryKeyConstraint(
      `primary_key_constraint`,
      primaryKeys as never[]
    );

    await builder.execute();
  }

  /**
   * @returns Datatype to use in sqlite for the columns
   */
  private _getDataType(column: Readonly<TableColumn>) {
    if (column.array) return "json";
    if (column.type == "array") return "json";
    if (column.type == "bool") return "boolean";
    if (column.type == "string") return "text";
    if (column.type == "i32") return "integer";
    if (column.type == "f32") return "decimal";
    if (column.type == "enumrow") return "text";
    if (column.type == "foreignrow") {
      if (column.name?.endsWith("Key")) return "integer";
      else return "text";
    }
    if (column.type == "row") {
      if (column.name?.endsWith("Key")) return "integer";
      else return "text";
    }
  }
}

/**
 * Tests the database tables and removes tables which data cannot be loaded
 * to prevent users try to load those tables and failing
 */
class TableTester extends PoEDB {
  constructor(dbPath: string) {
    super(dbPath, undefined, 1000 * 60 * 5);
  }

  private _errors: Record<string, { error: unknown }> = {};

  public async testTables() {
    const tables = await this.introspection.getTables();

    for (const table of tables) {
      try {
        await this.tryLoadTable(table.name as keyof Schema.DB, [
          Language.English,
        ]);
      } catch (error) {
        this._errors[table.name] = {
          error: (error as Error).message,
        };
      }
    }

    this._sqliteDb.close();

    const filePath = path.join(__dirname, "../docs/loadErrors.json");
    this._debug(`Saving load errors to %s`, filePath);
    fs.writeFileSync(filePath, JSON.stringify(this._errors, null, 2), {
      flag: "w",
    });

    await this._dropInvalidTables();
  }

  protected override async _insertData(
    data: ExportResult[],
    table: keyof Schema.DB
  ): Promise<void> {
    // test insertion of a single row to speed up the process
    const row = data?.[0];
    if (!row) throw new Error(`Empty data for table ${table}!`);
    await this.insertInto(table).values(row).execute();
  }

  protected override _preprocessData(
    data: ExportResult[],
    language: Language
  ): void {
    super._preprocessData([data[0]], language);
  }

  private async _dropInvalidTables() {
    const poedb = new PoEDB();

    this._debug(`Dropping %d invalid tables`, Object.keys(this._errors).length);

    for (const table of Object.keys(this._errors)) {
      await poedb.schema.dropTable(table).execute();
    }

    await generateTsInterface(this._debug, pathUtils.defaultDbPath());
  }
}

async function main() {
  try {
    // build the database & table schemas
    const builder = new DbBuilder();
    await builder.buildDatabase();

    // perform testing on a copy
    const dbCopyPath = builder.DbPath.replace(".db", "_copy.db");
    fs.copyFileSync(builder.DbPath, dbCopyPath);

    // test insertion into tables

    const tableTester = new TableTester(dbCopyPath);
    await tableTester.testTables();

    fs.rmSync(dbCopyPath, {
      force: true,
    });
  } catch (error) {
    console.log(error);
  }
}

void main();
