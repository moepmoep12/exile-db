const testPath = process.env.TEST_PATH || "tests/**/*.ts";

module.exports = {
  spec: [testPath],
  require: ["ts-node/register", "./tests/mochaFixtures.ts"],
  recursive: true,
  extension: [
    "ts"
  ],
  "parallel": false
};

