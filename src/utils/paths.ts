import path from "path";
import fs from "fs";

import { DB_FILE_NAME, DB_INTERFACE_FILE_NAME } from "../models/Constants";

export const defaultDbPath = (): string => {
  return path.join(__dirname, "../..", DB_FILE_NAME);
};

export const DbInterfacePath = (): string => {
  let filePath = path.join(__dirname, "../models", DB_INTERFACE_FILE_NAME);
  if (fs.existsSync(filePath)) return filePath;
  filePath = filePath.replace(".ts", ".d.ts");
  return filePath;
};
