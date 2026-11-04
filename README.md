# prettier-plugin-markdown-table-layout

a prettier plugin for markdown tables that stay compact and readable. choose how cells are spaced and how separators are sized, without padding every column to fit its longest value.

## features

- **compact, but readable**: keep one space around cell content without adding extra padding to align the pipes.
- **fit character limits**: remove alignment padding to leave more room for content in documents with strict character budgets.
- **control your separators**: use a fixed number of hyphens, match each header's width, or keep the existing hyphen counts.
- **keep diffs focused**: in the single-spaced layouts, editing a body cell does not change the padding or separators in other rows.
- **preserve column alignment**: keep left, center, right, and unspecified alignment in every layout.
- **keep your prettier workflow**: format prose and inline markdown as usual, honor `prettier-ignore`, and preserve markdown code examples by default in the single-spaced layouts.

## requirements

- prettier 3.0.0 or later within version 3 (`^3.0.0`).

## installation

install the plugin alongside prettier:

```sh
# npm
npm install -D prettier prettier-plugin-markdown-table-layout

# pnpm
pnpm add -D prettier prettier-plugin-markdown-table-layout
```

## quick start

add the plugin to your `.prettierrc` for compact tables with a single space around each cell:

```json
{
  "plugins": ["prettier-plugin-markdown-table-layout"]
}
```

then format your markdown files:

```sh
prettier --write "**/*.md"
```

before:

```md
| name  | age | city |
| ----- | --- | ---- |
| alice | 30  | nyc  |
| bob   | 25  | la   |
```

after:

```md
| name | age | city |
| --- | --- | --- |
| alice | 30 | nyc |
| bob | 25 | la |
```

the default layout is `fixed`, with three hyphens per separator and one space around cell content. existing column alignment is preserved: left-aligned columns use `:---`, right-aligned columns use `---:`, centered columns use `:---:`, and columns without explicit alignment use `---`. choose `compact` explicitly for separators with one hyphen and no spaces around cell content.

## configuration

### `tableLayout`

choose the table formatting style:

| value | behavior |
| :--- | :--- |
| `"fixed"` (default) | single-space padding and a configurable number of separator hyphens. |
| `"aligned"` | prettier's standard table formatting, with padding to align columns. |
| `"header"` | single-space padding and separators sized to their headers. |
| `"preserve"` | single-space padding while keeping each separator's original hyphen count. |
| `"compact"` | no cell padding and one hyphen per separator, plus any alignment colons. |

the `fixed`, `header`, and `preserve` layouts never expand separators to fit body content or add spaces to line up body rows. nonempty cells have one space on each side; empty cells contain one space in total (`| |`). all layouts print leading and trailing pipes.

in `compact`, `fixed`, `header`, and `preserve`, the header defines the expected column count. extra delimiter cells are omitted, and trailing empty body cells beyond that count are removed from each row independently. cells with content are never removed, and empty cells before later content or within the header's width keep their positions. explicit empty header cells still count as columns. the `preserve` layout keeps the hyphen counts of the retained delimiters. `aligned` delegates this handling to prettier.

#### fixed separators

use `tableLayout: "fixed"` for uniform separator hyphen counts. `tableSeparatorLength` controls the number of hyphens in every column; it defaults to `3` and must be an integer of at least `1`. alignment colons are added to that count.

```json
{
  "plugins": ["prettier-plugin-markdown-table-layout"],
  "tableLayout": "fixed",
  "tableSeparatorLength": 3
}
```

```md
| date | version | description | authors |
| :--- | ---: | :---: | --- |
| 2026-11-03 | 1.0 | update documentation | team |
```

this example uses left, right, center, and unspecified alignment. changing the separator length keeps those markers intact. `tableSeparatorLength` has no effect on other layouts.

#### header-sized separators

use `tableLayout: "header"` to size each separator to its formatted header, counting alignment colons as part of the total width:

```md
| date | version | description | authors |
| :--: | :-----: | :---------: | :-----: |
| 2026-11-03 | 1.0 | update documentation | team |
```

the separator's width is `max(3, headerWidth)`, so even a short or empty header has a valid separator. depending on alignment, the minimum is `---`, `:--`, `--:`, or `:-:`.

header width comes from prettier's `util.getStringWidth`, measured on the formatted markdown source without surrounding cell spaces. accented letters occupy one position, combining accents do not add width, and wide characters such as cjk and emoji generally occupy two. emoji sequences follow prettier's width handling.

this measures source text rather than rendered html. links include their brackets and destination, inline code includes backticks, emphasis includes its markers, and escaped pipes include the backslash. for example, `**bold**` has width `8`.

#### preserved separators

use `tableLayout: "preserve"` to normalize cell spacing while keeping each separator's original number of hyphens and alignment markers.

before:

```md
| date       | version    | description             | authors |
| :--: | :------: | :----: | :---: |
| 2026-11-03 | 1.0        | update documentation    | team    |
```

after:

```md
| date | version | description | authors |
| :--: | :------: | :----: | :---: |
| 2026-11-03 | 1.0 | update documentation | team |
```

counts come from each table's own delimiter row. header-only tables, optional outer pipes, and tables nested in lists or block quotes are supported.

#### compact and aligned layouts

use `tableLayout: "compact"` for the smallest separators and no spaces around cell content:

```md
| name | age | city |
| --- | --- | --- |
| alice | 30 | nyc |
```

becomes:

```md
|name|age|city|
|-|-|-|
|alice|30|nyc|
```

use `tableLayout: "aligned"` to delegate table formatting to prettier's standard printer, including its normal behavior for `printWidth` and `proseWrap`.

### `tableFillMissingCells`

boolean, default `true`. in the `compact`, `fixed`, `header`, and `preserve` layouts, append empty cells to short body rows until they have as many cells as the header. set it to `false` to leave short rows incomplete. existing cells keep their order and content, including explicit empty cells within the header's width. extra cells with content are kept; they do not change the expected column count. the removal of surplus delimiters and trailing empty cells is independent of this option. header-only tables do not gain body rows.

```json
{
  "plugins": ["prettier-plugin-markdown-table-layout"],
  "tableLayout": "header",
  "tableFillMissingCells": true
}
```

before:

```md
| actor | system |
| :---: | :---: |
| returns to the start |
| | sends the notification |
```

after:

```md
| actor | system |
| :---: | :----: |
| returns to the start | |
| | sends the notification |
```

this normalizes structure only. the plugin does not interpret text to choose a column or move existing content. if a system action is written in the first cell, it stays in the first cell; placing it in the system column requires a manual document edit.

only rows recognized as part of a table by the selected parser are normalized. depending on the parser and prettier version, text without any pipes directly after a delimiter row can be a table row or a separate paragraph. a mismatched header and delimiter may also be rejected as a table. the plugin follows those distinctions and formats paragraphs normally.

the `fixed`, `header`, and `preserve` layouts use one space in each empty cell (`| |`); `compact` uses no padding (`||`). separators keep their normal sizing and alignment rules. `aligned` ignores this option and continues to use prettier's standard table printer. ignored tables and preserved markdown/mdx code examples stay unchanged.

### `preserveMarkdownCodeBlocks`

boolean, default `true`. in the `fixed`, `header`, and `preserve` layouts, keep the contents of markdown code blocks unchanged instead of formatting them as embedded documents. markdown and mdx language names, aliases such as `md` and `pandoc`, and extensions recognized by prettier are included. prettier still handles outer fences, container indentation, and line endings.

set this option to `false` to format those examples with the selected table layout:

```json
{
  "plugins": ["prettier-plugin-markdown-table-layout"],
  "tableLayout": "header",
  "preserveMarkdownCodeBlocks": false
}
```

this option does not change the existing behavior of `compact` or `aligned`. blocks in other languages still follow prettier. if `embeddedLanguageFormatting` is `"off"`, embedded formatting is disabled for all languages regardless of this option.

### cli options

the same options are available from the command line. load the plugin explicitly with `--plugin` when passing its flags, so prettier recognizes them before discovering configuration files:

```sh
prettier --plugin prettier-plugin-markdown-table-layout --table-layout fixed --table-separator-length 3 --write "**/*.md"
prettier --plugin prettier-plugin-markdown-table-layout --table-layout header --write "**/*.md"
prettier --plugin prettier-plugin-markdown-table-layout --table-layout preserve --write "**/*.md"
prettier --plugin prettier-plugin-markdown-table-layout --table-layout header --table-fill-missing-cells --write "**/*.md"
```

use `--no-table-fill-missing-cells` to leave short body rows incomplete.

to allow formatting inside markdown code blocks:

```sh
prettier --plugin prettier-plugin-markdown-table-layout --table-layout header --no-preserve-markdown-code-blocks --write "**/*.md"
```

## compatibility

the plugin uses the [prettier 3 plugin api](https://prettier.io/blog/2023/07/05/3.0.0.html), including esm plugin loading and the `prettier/plugins/markdown` and `prettier/doc` module exports. its document builders, document printing utilities, `AstPath.node`, and `util.getStringWidth` are available in prettier 3.0.0, so no newer minimum is required.

the packaged plugin was installed in separate consumer projects and passed the full test suite with prettier 3.0.0 and 3.9.10. additional real-document validation covered prettier 3.9.6 and 3.9.8 on windows. these checks cover the listed versions rather than every release in the 3.x series.

the plugin uses prettier's markdown parser and printer for cell contents and the rest of the document. escaped pipes and inline code are supported; emphasis, links, headings, and prose keep their normal prettier formatting. `prettier-ignore` comments and ignore ranges retain their usual behavior. the `markdown`, `mdx`, and `remark` parsers are supported.

### markdownlint

the `fixed`, `header`, and `preserve` layouts match [`MD060` with `style: "compact"`](https://github.com/DavidAnson/markdownlint/blob/main/doc/md060.md), including its spacing rule for empty cells. the plugin's `compact` layout corresponds to markdownlint's `tight` style instead.

`tableFillMissingCells` fixes short body rows reported by `MD056` by default. extra cells with content and ignored tables can still trigger that rule, and `aligned` retains prettier's normal behavior. normalizing column counts does not resolve text placed in the wrong semantic column.

if `aligned_delimiter` is `true`, markdownlint also requires delimiter pipes to line up with the header pipes. the `header` layout meets this requirement when every header is at least three positions wide. shorter headers need wider separators to satisfy the minimum width. `fixed` and `preserve` do not guarantee delimiter alignment.

## development

install the existing development dependencies and run the checks:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm format:check
```

`pnpm format:check` checks the javascript files in `src/`, `test/`, and `scripts/`, workflow yaml files, this readme, and `package.json`, without changing them. it exits with an error if any file needs formatting. run `pnpm format` to format those same files.

to test the package as a consumer, generate and install its tarball in a temporary project and run the full test suite against that installation:

```sh
npm run test:package -- 3.0.0
npm run test:package -- 3
```

the first command tests the minimum supported prettier release; the second resolves the latest release within version 3. the check also verifies the package contents, loading the plugin by name from a prettier config, and the cli output. temporary files are removed after the check.

the ci workflow runs on pushes and pull requests. it checks formatting and tests with the frozen lockfile, then validates the installed package on linux, windows, and macos against both prettier versions. markdownlint remains a local tool and is not part of ci.

the test suite covers all five layouts, formatting stability, alignment markers, unicode widths, inline markdown, escaped pipes, empty cells, ignored content, nested tables, and configurable preservation of markdown code blocks. markdownlint compatibility was also checked with version 0.42.0; markdownlint is not a project dependency.

## credits and license

based on [myl7/prettier-plugin-compact-markdown-table](https://github.com/myl7/prettier-plugin-compact-markdown-table). `compact` retains the original spacing and separator rules, and `aligned` delegates to prettier. this fork uses `fixed` as its default.

Copyright (C) 2026 Yulong Ming <i@myl7.org>.

Copyright (C) 2026 Lucas Duarte <luuuuuqui@proton.me>.

licensed under the [Apache License, Version 2.0](LICENSE.txt).
