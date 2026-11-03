# prettier-plugin-markdown-table-layout

Prettier plugin for compact and single-spaced markdown tables with configurable separators.

This [fork](https://github.com/luuuuuqui/prettier-plugin-markdown-table-layout) of [myl7/prettier-plugin-compact-markdown-table](https://github.com/myl7/prettier-plugin-compact-markdown-table) adds single-spaced layouts. The existing `compact` default and `aligned` layout are unchanged.

Resolves [prettier/prettier#12074](https://github.com/prettier/prettier/issues/12074), [prettier/prettier#14722](https://github.com/prettier/prettier/issues/14722), [prettier/prettier#16954](https://github.com/prettier/prettier/issues/16954).

## Features

- **Compact tables**: Strip all whitespace padding or alignment and reduce separators for table cells.
- **Single-spaced tables**: Keep one space around content with fixed, header-sized, or preserved separators, without padding columns to match body cells.
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
|`"fixed"`|Single-space padding, fixed separator hyphen count.|
|`"header"`|Single-space padding, separators sized to formatted headers.|
|`"preserve"`|Single-space padding, preserve each separator's hyphen count.|

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

### Single-spaced layouts

The `fixed`, `header`, and `preserve` layouts put exactly one space before and after nonempty cell content. Empty cells contain one space in total (`| |`). They never add padding to align body rows, and body content never affects separator lengths. Left (`:---`), right (`---:`), center (`:---:`), and unspecified (`---`) alignment keep their meaning in all layouts.

#### Fixed separators

Set `tableLayout` to `"fixed"`:

```json
{
  "plugins": ["prettier-plugin-markdown-table-layout"],
  "tableLayout": "fixed",
  "tableSeparatorLength": 3
}
```

Output:

```md
| Date | Version | Description | Authors |
| :--- | ---: | :---: | --- |
| 2026-11-03 | 1.0 | Update documentation | Team |
```

`tableSeparatorLength` is an integer with default `3` and minimum `1`. It counts only hyphens, so alignment colons add to the separator's total width. Invalid lengths are rejected. This option only affects `fixed`; other layouts ignore it.

CLI equivalent:

```sh
prettier --table-layout fixed --table-separator-length 3 --write "**/*.md"
```

#### Header-sized separators

Set `tableLayout` to `"header"`:

```md
| Date | Version | Description | Authors |
| :--: | :-----: | :---------: | :-----: |
| 2026-11-03 | 1.0 | Update documentation | Team |
```

Separator width is `max(3, headerWidth)`, including alignment colons. There is always at least one hyphen: a short or empty header produces `---`, `:--`, `--:`, or `:-:` according to its alignment.

`headerWidth` uses Prettier's `util.getStringWidth` on the formatted Markdown source of the header, excluding the surrounding cell spaces. Accented letters occupy one position, combining accents do not add width, and wide characters such as CJK and emoji generally occupy two. Prettier handles emoji sequences. This measures source text, not rendered HTML: links include their destination and brackets, inline code includes backticks, emphasis includes its markers, and escaped pipes include the backslash. For example, `**bold**` has width `8`.

#### Preserved separators

Set `tableLayout` to `"preserve"`. Each column keeps its original number of hyphens while cell spacing is normalized.

Before:

```md
| Date       | Version    | Description             | Authors |
| :--: | :------: | :----: | :---: |
| 2026-11-03 | 1.0        | Update documentation    | Team    |
```

After:

```md
| Date | Version | Description | Authors |
| :--: | :------: | :----: | :---: |
| 2026-11-03 | 1.0 | Update documentation | Team |
```

Counts are read from each parsed table's original delimiter row. Tables with optional outer pipes, tables in lists and block quotes, and header-only tables are supported. Output uses leading and trailing pipes in every layout.

### Markdownlint compatibility

All three single-spaced layouts match [`MD060` with `style: "compact"`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md060.md), including its single-space rule for empty cells. The plugin's older `compact` layout corresponds to markdownlint's `tight` style instead; the names differ.

With `aligned_delimiter: true`, markdownlint additionally requires delimiter pipes to line up with header pipes. The `header` layout does this when headers are at least three positions wide; shorter headers need the minimum valid separator width. `fixed` and `preserve` do not guarantee delimiter alignment.

### Other Markdown content

Cells are printed by Prettier before the table layout is applied, preserving escaped pipes, inline code, and normal inline formatting. `prettier-ignore` comments and ignore ranges keep their usual behavior. Headings, prose, and other Markdown nodes still use Prettier's printer. Plain code blocks are not treated as tables.

### `preserveMarkdownCodeBlocks`

Boolean, default `true`. In the `fixed`, `header`, and `preserve` layouts, keep Markdown code block content unchanged instead of formatting it as an embedded document. This includes Markdown and MDX language names, aliases such as `md` and `pandoc`, and extensions recognized by Prettier. Prettier still handles the outer fence and container indentation.

Set this option to `false` to format the examples with the selected table layout:

```json
{
  "plugins": ["prettier-plugin-markdown-table-layout"],
  "tableLayout": "header",
  "preserveMarkdownCodeBlocks": false
}
```

CLI equivalent:

```sh
prettier --table-layout header --no-preserve-markdown-code-blocks --write "**/*.md"
```

This option does not change `compact` or `aligned`, which retain their existing embedded formatting behavior. Blocks in other languages still follow Prettier. Prettier's `embeddedLanguageFormatting: "off"` takes precedence and disables embedded formatting for all languages, even if this option is `false`.

### Development

Use the existing development dependencies; no additional packages are required:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm format:check
```

The tests cover the existing layouts and all three new layouts, including formatting twice to check stability, alignment markers, source widths, escaped pipes, inline code, empty cells, ignore comments, and nested tables across the `markdown`, `mdx`, and `remark` parsers.

Markdownlint 0.42.0 was also run temporarily against 210 formatted outputs with `MD060: { "style": "compact" }`, including empty cells, Unicode, inline markup, and nested tables. All passed and remained stable on a second format. Markdownlint is not a project dependency.

## Licenses

Copyright (C) 2026 Yulong Ming <i@myl7.org>

Apache License, Version 2.0
