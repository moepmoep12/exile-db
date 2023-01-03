import { describe, it } from "mocha";
import { expect } from "chai";
import { step } from "mocha-steps";

import { PoEDB } from "../src/PoEDB";
import { Language } from "../src/models/Language";

describe(`PoEDB`, function () {
  this.timeout(20000);

  const poedb = new PoEDB();
  const essenceTable = "Essences";
  const baseItemTypesTable = "BaseItemTypes";

  before(async () => {
    await poedb.deleteFrom(essenceTable).execute();
    await poedb.deleteFrom(baseItemTypesTable).execute();
  });

  it(`loadTable(${essenceTable}) - should load table ${essenceTable}`, async () => {
    await expect(poedb.tryLoadTable(essenceTable)).to.be.fulfilled;
  });

  it(`loadTable(${baseItemTypesTable}) - should load table ${baseItemTypesTable}`, async () => {
    await expect(poedb.tryLoadTable(baseItemTypesTable)).to.be.fulfilled;
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  step(`SELECT JOIN - should return essence with name`, async () => {
    //
    const result = await poedb
      .selectFrom(essenceTable)
      .innerJoin(
        "BaseItemTypes",
        "BaseItemTypes._index",
        "Essences.BaseItemTypesKey"
      )
      .select("BaseItemTypes.Name")
      .where("Essences.BaseItemTypesKey", "=", 75)
      .where("Essences.Language", "=", Language.English)
      .execute();

    expect(result.length).to.be.greaterThan(0);

    const item = result[0];
    expect(item.Name).to.be.equal("Muttering Essence of Hatred");
  });
});
