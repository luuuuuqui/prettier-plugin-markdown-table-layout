# prettier-plugin-markdown-table-layout

Prettier plugin for compact markdown tables without cell padding or alignment

Resolves [prettier/prettier#12074](https://github.com/prettier/prettier/issues/12074), [prettier/prettier#14722](https://github.com/prettier/prettier/issues/14722), [prettier/prettier#16954](https://github.com/prettier/prettier/issues/16954).

## Features

- **Compact tables**: Strip all whitespace padding or alignment and reduce separators for table cells.
- **Save LLM tokens**: A 5-column, 10-row table saves ~21% of table tokens and ~32% of characters with compact formatting.
- **Fit character limits**: Useful for submissions with strict character budgets, e.g., OpenReview rebuttals capped at 5000 characters.

## Prerequisites

- Prettier >= 3.0.0

## Get Started

Install this fork alongside Prettier:

```sh
# npm
npm install -D prettier github:luuuuuqui/prettier-plugin-markdown-table-layout

# pnpm
pnpm add -D prettier github:luuuuuqui/prettier-plugin-markdown-table-layout
```

Add the plugin to your `.prettierrc`:

```json
{
  "plugins": ["prettier-plugin-markdown-table-layout"]
}
```

Then format as usual:

```sh
prettier --write "**/*.md"
```

Before:

```md
| Name  | Age | City |
| ----- | --- | ---- |
| Alice | 30  | NYC  |
| Bob   | 25  | LA   |
```

After:

```md
|Name|Age|City|
|-|-|-|
|Alice|30|NYC|
|Bob|25|LA|
```

## Config

### `tableLayout`

|Value|Description|
|-|-|
|`"compact"` (default)|No cell padding, minimal separators.|
|`"aligned"`|Pad cells to align columns (Prettier default).|

Set in `.prettierrc`:

```json
{
  "tableLayout": "compact"
}
```

Or pass via CLI:

```sh
prettier --table-layout aligned --write "**/*.md"
```

## Licenses

Copyright (C) 2026 Yulong Ming <i@myl7.org>

Apache License, Version 2.0
