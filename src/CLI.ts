#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import Debug from "debug";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
config();

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
  database?: string;

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
}

async function main() {
  const debug = Debug(`poe-db:`).extend("CLI");
  Debug.enable("poe-db:*,poe-dat:*");
  try {
    const parser = yargs(hideBin(process.argv))
      .options({
        tables: {
          array: true,
          alias: "t",
          description: "The names of the tables to load",
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
          description: "The directory for caching",
        },
        cacheduration: {
          type: "number",
          description:
            "The duration in ms for items to stay in in-memory cache",
        },
        languages: {
          type: "string",
          alias: "l",
          array: true,
          description:
            "In which languages the tables will be loaded. Default: English",
          choices: Object.values(Language),
        },
      })
      .check((a) => {
        return a.tables != undefined || a.config != undefined;
      })
      .strict();

    const argv = await parser.argv;

    let config: Arguments;

    if (argv.config) {
      const configPath = path.isAbsolute(argv.config)
        ? argv.config
        : path.resolve(argv.config);

      debug(`Reading config from path %s`, configPath);
      config = JSON.parse(fs.readFileSync(configPath).toString()) as Arguments;
      if (!config.tables || config.tables.length == 0) {
        throw new Error(`Tables not specified in config!`);
      }
    } else {
      config = {
        tables: argv.tables as Array<keyof Schema.DB>,
        cachedir: argv.cachedir,
        cacheduration: argv.cacheduration,
        database: argv.database,
        languages: argv.languages as Array<Language>,
      };
    }

    let dbPath = config.database;
    if (dbPath && !path.isAbsolute(dbPath)) dbPath = path.resolve(dbPath);
    if (!dbPath) dbPath = defaultDbPath();

    if (dbPath && !fs.existsSync(dbPath)) {
      debug(
        `DB not found at specified location. Copying database to %s`,
        dbPath
      );
      fs.copyFileSync(defaultDbPath(), dbPath);
    }

    const poedb = new PoEDB(dbPath, config.cachedir, config.cacheduration);

    const languages = config.languages ? config.languages : [Language.English];

    for (const lang of languages) {
      if (!Object.values(Language).includes(lang)) {
        throw new Error(`Invalid language '${lang}'`);
      }
    }

    for (const table of config.tables || []) {
      await poedb.tryLoadTable(table, languages);
    }

    debug(`Successfully loaded tables into db at %s`, dbPath);
  } catch (error) {
    debug("%O", error);
  }
}

void main();
