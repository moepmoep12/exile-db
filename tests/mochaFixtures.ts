import { config } from "dotenv";
config();

import chai from "chai";
import chaiAsPromised from "chai-as-promised";

export function mochaGlobalSetup(): void {
  chai.use(chaiAsPromised);
}
