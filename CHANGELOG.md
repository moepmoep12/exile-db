## [5.0.1](https://github.com/moepmoep12/exile-db/compare/v5.0.0...v5.0.1) (2023-01-22)


### Bug Fixes

* update schema ([83a42eb](https://github.com/moepmoep12/exile-db/commit/83a42eb7048b3ebba79b3d9f471d5b487b205d0e))

# [5.0.0](https://github.com/moepmoep12/exile-db/compare/v4.0.0...v5.0.0) (2023-01-03)


* Add option to load all tables to CLI ([7d2b97d](https://github.com/moepmoep12/exile-db/commit/7d2b97dae6e18b105aa6f9d69fb895efb079653e)), closes [#1](https://github.com/moepmoep12/exile-db/issues/1) [#2](https://github.com/moepmoep12/exile-db/issues/2)


### BREAKING CHANGES

* - schema changed due to latest patch 3.20
- The option `tables` of the load command can now be set to `*` to load all tables of the database

# [4.0.0](https://github.com/moepmoep12/exile-db/compare/v3.1.0...v4.0.0) (2022-11-22)


### Features

* Add CLI option removeUnusedTables ([e7437c2](https://github.com/moepmoep12/exile-db/commit/e7437c2e5f847dfd57abb4f8e5767d9d1c38d614))


### BREAKING CHANGES

* Columns with null foreign keys are now properly loaded using null and not 0xfefefefefefefefe.

# [3.1.0](https://github.com/moepmoep12/exile-db/compare/v3.0.0...v3.1.0) (2022-11-20)


### Features

* add Getter & resolve paths ([15f1673](https://github.com/moepmoep12/exile-db/commit/15f167337f6b00d45bfd727b22d2665dfac41f23))

# [3.0.0](https://github.com/moepmoep12/exile-db/compare/v2.0.0...v3.0.0) (2022-11-15)


* Change row type to integer ([489a14d](https://github.com/moepmoep12/exile-db/commit/489a14d20af252b7ac7ffb64fa99089592270ce6))


### BREAKING CHANGES

* 'row' and 'foreignrow' columns are now all integer columns in SQLite

# [2.0.0](https://github.com/moepmoep12/exile-db/compare/v1.1.2...v2.0.0) (2022-11-12)


* Rename to exile-db ([88a1bba](https://github.com/moepmoep12/exile-db/commit/88a1bba7bf02bbf42c6f270e9c0aafa6f4a9f4b6))


### BREAKING CHANGES

* The package was renamed to exile-db to better distinguish it from the website poedb.tw

## [1.1.2](https://github.com/moepmoep12/exile-db/compare/v1.1.1...v1.1.2) (2022-11-12)

### Bug Fixes

- Update README.md ([cc66670](https://github.com/moepmoep12/exile-db/commit/cc66670c3bd212f6bf798e1d84e96f88a9071835))

## [1.1.1](https://github.com/moepmoep12/exile-db/compare/v1.1.0...v1.1.1) (2022-11-12)

### Bug Fixes

- Update README.md with new CLI ([388cb6e](https://github.com/moepmoep12/exile-db/commit/388cb6e9a25dc28b9c9c9e9e840bfa55b43b8d51))

# [1.1.0](https://github.com/moepmoep12/exile-db/compare/v1.0.3...v1.1.0) (2022-11-12)

### Features

- Add CLI commands & silent insert ([6638c54](https://github.com/moepmoep12/exile-db/commit/6638c5499e70ac4fa508a4b1249127bccf9ba532))

## [1.0.3](https://github.com/moepmoep12/exile-db/compare/v1.0.2...v1.0.3) (2022-11-11)

### Bug Fixes

- default db path ([d9ea704](https://github.com/moepmoep12/exile-db/commit/d9ea70462249d2718f25738c7d3af29059857ecf))

## [1.0.2](https://github.com/moepmoep12/exile-db/compare/v1.0.1...v1.0.2) (2022-11-11)

### Bug Fixes

- default db path ([b5d3d2a](https://github.com/moepmoep12/exile-db/commit/b5d3d2ad9b247c982b2afe8a7aa90da13faa5606))

## [1.0.1](https://github.com/moepmoep12/exile-db/compare/v1.0.0...v1.0.1) (2022-11-11)

### Bug Fixes

- version ([a1f5c52](https://github.com/moepmoep12/exile-db/commit/a1f5c52d0fc6ff15484afea4867490e8916dde32))

# 1.0.0 (2022-11-11)

### Bug Fixes

- Add missing deps for CLI ([b8475c0](https://github.com/moepmoep12/exile-db/commit/b8475c0afe8293a8797dfca58f5a61e21cc203f5))
