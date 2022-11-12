# exile-db

![NPM Version](https://img.shields.io/npm/v/npm) ![LICENSE](https://img.shields.io/github/license/moepmoep12/exile-db) ![TOP LANGUAGE](https://img.shields.io/github/languages/top/moepmoep12/exile-db) ![ISSUES](https://img.shields.io/github/issues/moepmoep12/exile-db)

## Table of Contents

- [Introduction](#introduction)
- [Overview](#overview)
- [Installation](#installation)
- [Getting started](#getting-started)
- [Notes](#notes)
  - [Missing tables](#missing-tables)
  - [Foreign key constraint](#foreign-key-constraint)
  - [The \_index column](#the-_index-column)
- [Debug](#debug)
- [Related projects](#related-projects)

## Introduction

The purpose of this library is to provide a database to developers containing data from the game [Path of Exile](https://www.pathofexile.com/) (PoE) by Grinding Gear Games.
The database is provided as a SQLite database and contains only the tables and their schema without data. The library provides an API & CLI for loading the table data dynamically.
Queries are built with [kysely](https://github.com/koskimas/kysely). Because the database is a SQLite database, it can be used outside of JS/TS applications.

> Note: This product isn't affiliated with or endorsed by Grinding Gear Games in any way.

> Note: The library was formerly known as `poe-db`. The name was changed to exile-db to distinguish it from the website [poedb.tw](https://poedb.tw/us/).

## Overview

The key objectives of this library are:

- Provide SQLite database for game data
- Provide API & CLI to load the desired tables dynamically
- Support all languages

## Installation

Install the latest stable version of this library:

```bash
 npm install --save exile-db
```

## Getting started

Since the database is initially empty (only containing the schema), the desired tables need to be loaded first. Which tables to load depends on the application.
This can be done either at runtime, e.g. when the application starts, with a custom script (not at runtime), or by using the CLI (recommended).

Loading once via the CLI:

```bash
exile-db load --tables CurrencyItems BaseItemTypes --languages English German --database ./mydb.db
```

Alternatively, the options could be loaded from a config JSON. This is recommended for most applications because one has not to remember all the required tables for every new patch. See the [Arguments](https://github.com/moepmoep12/exile-db/blob/1df73b10062e04aeefa6ebc497b8caf7e0af7f0b/src/CLI.ts#L15) interface for options.

```bash
exile-db load --config ./poedb.config.json
```

```json
// poedb.config.json
{
  "tables": ["CurrencyItems", "BaseItemTypes"],
  "database": "./test.db"
}
```

Furthermore, a custom script could be used to load the tables:

```typescript
import { PoEDB, Language, Schema } from "exile-db";

const requiredTables: Array<keyof Schema.DB> = [
  "BaseItemTypes",
  "CurrencyItems",
];

const poedb = new PoEDB();

await Promise.all(
  requiredTables.map((table) => poedb.tryLoadTable(table, [Language.English]))
);
```

Once the table data has been loaded, it is persistently saved in the database and queries can be performed at runtime.
For details regarding the query builder refer to [kysely](https://github.com/koskimas/kysely).

```typescript
try {
  const results = await poedb
    .selectFrom("CurrencyItems")
    .innerJoin(
      "BaseItemTypes",
      "CurrencyItems.BaseItemTypesKey",
      "BaseItemTypes._index"
    )
    .select("BaseItemTypes.Name")
    .where("CurrencyItems.BaseItemTypesKey", "=", 20)
    .limit(1)
    .execute();

  console.log(results); // [ { Name: 'Orb of Fusing' } ]
} catch (error) {
  // error handling
}
```

## Notes

### Missing tables

Not all tables described in the [schema file](https://github.com/poe-tool-dev/dat-schema/releases/download/latest/schema.min.json) are present in the database. There are two reasons why a table is not in the database:

- The schema of the table contains only NULL columns, see [Build Errors](./docs/buildErrors.json) for a list
- Loading data for the table fails, see [Load Errors](./docs/loadErrors.json) for a list. Some tables are listed in the schema but are actually not present in the current patch, thus loading them will always fail.

### Foreign key constraint

A constraint on foreign keys is not used due to the fact that tables are filled dynamically by the user.

### The \_index column

In some tables a column might refer to a another table (foreign key). However, it is not specified to which key the foreign key refers. In some cases it is the `_index` key like in the example above while in other cases it might be the `Id` column. Check the respective tables, for example via [poe-dat-viewer](https://github.com/SnosMe/poe-dat-viewer) before making queries.

## Debug

Debug information can be displayed by setting the `DEBUG` environment variable. In order to display debug information of all modules add `exile-db:*` to `DEBUG`. Multiple entries are separated by comma or space.
For more information refer to the [debug library](<[https://](https://github.com/debug-js/debug)>).

## Related projects

- [poe-dat-export](https://github.com/moepmoep12/poe-dat-export)
- [poe-dat-viewer](https://github.com/SnosMe/poe-dat-viewer)
- [dat-schema](https://github.com/poe-tool-dev/dat-schema)
- [RePoE](https://github.com/brather1ng/RePoE)
