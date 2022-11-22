#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import Debug from "debug";
import fs from "fs";
import path from "path";

import { PoEDB } from "./PoEDB";
import { defaultDbPath } from "./utils/paths";
import { Language, Schema } from "./models";

interface Arguments {
  /**
   * The names of the tables to load
   */
  tables: Array<keyof Schema.DB>;

  /**
   * The path to the database.
   * Can be either absolute or relative.
   * If the database is not at the specified path,
   * it will be copied from the default path in the node_modules.
   */
  database: string;

  /**
   * The directory for caching
   */
  cachedir?: string;

  /**
   * The duration in ms for items to stay in in-memory cache
   */
  cacheduration?: number;

  /**
   * In which languages the tables will be loaded. Default: English
   */
  languages?: Array<Language>;

  /**
   * Whether duplicate key errors are ignored on insertion. Default: true
   */
  silent?: boolean;

  /**
   * Whether to remove unused tables, that is, all tables not in `tables`.
   * Default: false
   */
  removeUnusedTables?: boolean;
}

Debug.enable("exile-db:*");
const debug = Debug(`exile-db:`).extend("CLI");

/**
 * Loads a database with the given config & tables
 *
 * @param config The config to use
 */
export async function loadTables(config: Arguments) {
  if (!config.tables || config.tables.length == 0) {
    throw new Error(`No tables specified!`);
  }

  let dbPath = config.database;
  if (dbPath && !path.isAbsolute(dbPath)) dbPath = path.resolve(dbPath);

  if (dbPath && !fs.existsSync(dbPath)) {
    debug(`DB not found at specified location. Copying database to %s`, dbPath);
    fs.copyFileSync(defaultDbPath(), dbPath);
  }

  config.database = dbPath;
  config.languages = config.languages ? config.languages : [Language.English];

  debug(`Loading tables with config: %O`, config);

  const poedb = new PoEDB(dbPath, config.cachedir, config.cacheduration);

  for (const lang of config.languages) {
    if (!Object.values(Language).includes(lang)) {
      throw new Error(`Invalid language '${lang}'`);
    }
  }

  for (const table of config.tables || []) {
    await poedb.tryLoadTable(table, config.languages, config.silent);
  }

  debug(`Successfully loaded tables into db at %s`, dbPath);

  if (config.removeUnusedTables) {
    debug(`Removing unused tables`);

    const tables = await poedb.introspection.getTables();
    for (const table of tables) {
      if (config.tables.includes(table.name as keyof Schema.DB)) continue;

      await poedb.schema.dropTable(table.name).execute();
    }
  }
}

export async function clearDb(dbPath: string) {
  debug(`Clearing database at %s`, dbPath);
  const poedb = new PoEDB(dbPath);
  const tables = await poedb.introspection.getTables();
  for (const table of tables) {
    await poedb.deleteFrom(table.name as keyof Schema.DB).execute();
  }
  debug(`Successfully cleared database at %s`, dbPath);
}

export async function main() {
  try {
    const parser = yargs(hideBin(process.argv))
      .command(
        ["load", "l"],
        "Loads tables into the database",
        (builder) => {
          return builder
            .options({
              tables: {
                array: true,
                alias: "t",
                description: "The names of the tables to load.",
              },
              config: {
                type: "string",
                alias: "c",
                description:
                  "Absolute or relative path to a config JSON file. Other CLI arguments will be ignored if specified.",
              },
              database: {
                type: "string",
                alias: "d",
                description:
                  "The path to the database. Can be either absolute or relative. If the database is not at the specified path, it will be copied from the default path in the node_modules.",
              },
              cachedir: {
                type: "string",
                description: "The directory used for caching.",
              },
              cacheduration: {
                type: "number",
                description:
                  "The duration in ms for items to stay in in-memory cache.",
              },
              languages: {
                type: "string",
                alias: "l",
                array: true,
                description: "In which languages the tables will be loaded.",
                choices: Object.values(Language),
                default: [Language.English],
              },
              silent: {
                type: "boolean",
                alias: "s",
                description:
                  "Whether duplicate key errors are ignored on insertion.",
                default: true,
              },
              removeUnusedTables: {
                type: "boolean",
                alias: "r",
                description:
                  "Whether to remove unused tables, that is, all tables not in `tables`",
                default: false,
              },
            })
            .check((a) => {
              return a.tables != undefined || a.config != undefined;
            })
            .strict();
        },
        async (argv) => {
          let config: Arguments = argv as Arguments;
          if (argv.config) {
            const configPath = path.isAbsolute(argv.config)
              ? argv.config
              : path.resolve(argv.config);

            debug(`Reading config from path %s`, configPath);
            config = JSON.parse(
              fs.readFileSync(configPath).toString()
            ) as Arguments;
          }
          await loadTables(config);
        }
      )
      .command(
        ["clear", "c", "delete"],
        "Clears the database by removing all data",
        (yarg) => {
          return yarg.options({
            database: {
              type: "string",
              alias: "d",
              description:
                "The path to the database. Can be either absolute or relative. If not provided, default path in the node_modules will be used.",
              default: defaultDbPath(),
            },
          });
        },
        async (argv) => {
          let dbPath = argv.database;
          if (dbPath && !path.isAbsolute(dbPath)) dbPath = path.resolve(dbPath);
          if (!dbPath) dbPath = defaultDbPath();
          await clearDb(dbPath);
        }
      );

    await parser.argv;
  } catch (error) {
    debug("%O", error);
  }
}

void main();
