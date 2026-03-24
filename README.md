# Datathing ChartKit Monorepo

This repository contains Datathing ChartKit and its companion example host app.

## Repository Layout

- `chartkit`
  - the publishable `@austrade/chartkit` package
  - source, build config, package README, and integration checklist
- `example-react-app`
  - a React host app that consumes the local ChartKit package
  - example queries, flat-file data, and CI smoke-test coverage

## Main Documentation

- package docs:
  - `./chartkit/README.md`
- integration checklist:
  - `./chartkit/docs/integration-checklist.md`
- example app docs:
  - `./example-react-app/README.md`

## Common Commands

Build the package:

```bash
cd chartkit
npm install
npm run build
```

Run the example app:

```bash
cd example-react-app
npm install
npm run prepare:duckdb
npm run dev
```

Build both:

```bash
cd chartkit
npm run build

cd ../example-react-app
npm run build
```

## CI

GitHub Actions workflow:

- `./.github/workflows/chartkit-ci.yml`

It validates:

- package build
- example app build
- browser smoke test for the example app
