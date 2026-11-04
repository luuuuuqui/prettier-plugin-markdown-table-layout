import { test, expect } from "vitest";
import * as prettier from "prettier";
import * as plugin from "../src/index.js";

const layouts = ["compact", "fixed", "header", "preserve"];
const parsers = ["markdown", "mdx", "remark"];
const combinations = parsers.flatMap((parser) =>
    layouts.map((tableLayout) => [parser, tableLayout]),
);

async function format(input, options) {
    const config = { plugins: [plugin], tableFillMissingCells: true, ...options };
    const output = await prettier.format(input, config);
    expect(await prettier.format(output, config)).toBe(output);
    return output;
}

const header = "| Actor | System | Note | Result |\n";
const delimiter = "| :------ | ------: | :------: | ------ |\n";
const separators = {
    compact: "|:-|-:|:-:|-|\n",
    fixed: "| :--- | ---: | :---: | --- |\n",
    header: "| :---- | -----: | :--: | ------ |\n",
    preserve: delimiter,
};

function tableHeader(tableLayout) {
    return (
        (tableLayout === "compact" ? "|Actor|System|Note|Result|\n" : header) +
        separators[tableLayout]
    );
}

test.each(combinations)(
    "%s appends only missing trailing cells in %s layout",
    async (parser, tableLayout) => {
        const input =
            header +
            delimiter +
            "| system sends a very long notification |\n" +
            "| actor | response |\n" +
            "| actor | response | note |\n" +
            "| | response |\n" +
            "| actor | |\n" +
            "| |\n" +
            "| complete | row | stays | complete |\n" +
            "| extra | cells | are | kept | here |\n";
        const body =
            tableLayout === "compact"
                ? "|system sends a very long notification||||\n" +
                  "|actor|response|||\n" +
                  "|actor|response|note||\n" +
                  "||response|||\n" +
                  "|actor||||\n" +
                  "|||||\n" +
                  "|complete|row|stays|complete|\n" +
                  "|extra|cells|are|kept|here|\n"
                : "| system sends a very long notification | | | |\n" +
                  "| actor | response | | |\n" +
                  "| actor | response | note | |\n" +
                  "| | response | | |\n" +
                  "| actor | | | |\n" +
                  "| | | | |\n" +
                  "| complete | row | stays | complete |\n" +
                  "| extra | cells | are | kept | here |\n";
        expect(await format(input, { parser, tableLayout })).toBe(tableHeader(tableLayout) + body);
    },
);

test.each(combinations)(
    "%s fills short rows by default and preserves them when disabled in %s layout",
    async (parser, tableLayout) => {
        const input = header + delimiter + "| text |\n| | response |\n";
        const expected =
            tableHeader(tableLayout) +
            (tableLayout === "compact" ? "|text|\n||response|\n" : "| text |\n| | response |\n");
        const config = { parser, plugins: [plugin], tableLayout };
        const defaultOutput = await prettier.format(input, config);
        expect(defaultOutput).toBe(await format(input, { parser, tableLayout }));
        expect(defaultOutput).not.toBe(expected);
        const disabled = { ...config, tableFillMissingCells: false };
        const output = await prettier.format(input, disabled);
        expect(output).toBe(expected);
        expect(await prettier.format(output, disabled)).toBe(output);
    },
);

test.each(combinations)(
    "%s leaves complete and header-only tables unchanged by filling in %s layout",
    async (parser, tableLayout) => {
        for (const body of ["", "| actor | response | | result |\n", "\nplain paragraph\n"]) {
            const input = header + delimiter + body;
            const baseline = await prettier.format(input, {
                parser,
                plugins: [plugin],
                tableLayout,
                tableFillMissingCells: false,
            });
            expect(await format(input, { parser, tableLayout })).toBe(baseline);
        }
    },
);

test.each(combinations)(
    "%s follows the parser for text without pipes after a table in %s layout",
    async (parser, tableLayout) => {
        const input = header + delimiter + "plain paragraph\n";
        const ast = await plugin.parsers[parser].parse(input, { parser });
        const table = ast.children.find((node) => node.type === "table");
        expect([1, 2]).toContain(table.children.length);
        const expected =
            table.children.length === 2
                ? tableHeader(tableLayout) +
                  (tableLayout === "compact"
                      ? "|plain paragraph||||\n"
                      : "| plain paragraph | | | |\n")
                : await prettier.format(input, {
                      parser,
                      plugins: [plugin],
                      tableLayout,
                      tableFillMissingCells: false,
                  });
        expect(await format(input, { parser, tableLayout })).toBe(expected);
    },
);

test.each(combinations)(
    "%s keeps inline content and empty headers intact in %s layout",
    async (parser, tableLayout) => {
        const input =
            "| | | | |\n| :- | -: | :-: | - |\n" +
            "| café 👩🏽‍💻 **bold** a\\|b | `x\\|y` | [docs](https://example.com) |\n";
        const expected =
            tableLayout === "compact"
                ? "|||||\n|:-|-:|:-:|-|\n" +
                  "|café 👩🏽‍💻 **bold** a\\|b|`x\\|y`|[docs](https://example.com)||\n"
                : "| | | | |\n" +
                  {
                      fixed: "| :--- | ---: | :---: | --- |\n",
                      header: "| :-- | --: | :-: | --- |\n",
                      preserve: "| :- | -: | :-: | - |\n",
                  }[tableLayout] +
                  "| café 👩🏽‍💻 **bold** a\\|b | `x\\|y` | [docs](https://example.com) | |\n";
        expect(await format(input, { parser, tableLayout })).toBe(expected);
    },
);

test.each(combinations)(
    "%s fills tables without outer pipes and inside containers in %s layout",
    async (parser, tableLayout) => {
        const input =
            "Actor | System | Note | Result\n:------ | ------: | :------: | ------\ntext | response\n";
        const expected =
            tableHeader(tableLayout) +
            (tableLayout === "compact" ? "|text|response|||\n" : "| text | response | | |\n");
        expect(await format(input, { parser, tableLayout })).toBe(expected);
        for (const [first, rest] of [
            ["> ", "> "],
            ["- ", "  "],
            ["> - ", ">   "],
        ]) {
            const wrap = (text) =>
                text
                    .trimEnd()
                    .split("\n")
                    .map((line, index) => (index === 0 ? first : rest) + line)
                    .join("\n") + "\n";
            expect(await format(wrap(input), { parser, tableLayout })).toBe(wrap(expected));
        }
    },
);

test.each(combinations)(
    "%s honors ignored short tables and still fills other tables in %s layout",
    async (parser, tableLayout) => {
        const short = header + delimiter + "| text |\n";
        const filled =
            tableHeader(tableLayout) +
            (tableLayout === "compact" ? "|text||||\n" : "| text | | | |\n");
        const ignored = "<!-- prettier-ignore -->\n" + short;
        const range =
            "<!-- prettier-ignore-start -->\n\n" + short + "\n<!-- prettier-ignore-end -->\n";
        for (const prefix of [ignored, range]) {
            expect(await format(prefix + "\n" + short, { parser, tableLayout })).toBe(
                prefix + "\n" + filled,
            );
        }
    },
);

test.each(parsers.flatMap((parser) => layouts.slice(1).map((layout) => [parser, layout])))(
    "%s follows Markdown example preservation when filling in %s layout",
    async (parser, tableLayout) => {
        const short = header + delimiter + "| text |\n";
        const filled = tableHeader(tableLayout) + "| text | | | |\n";
        for (const language of ["markdown", "mdx"]) {
            const block = "```" + language + "\n" + short + "```\n";
            expect(await format(block + "\n" + short, { parser, tableLayout })).toBe(
                block + "\n" + filled,
            );
            expect(
                await format(block, {
                    parser,
                    tableLayout,
                    preserveMarkdownCodeBlocks: false,
                }),
            ).toBe("```" + language + "\n" + filled + "```\n");
            expect(
                await format(block, {
                    parser,
                    tableLayout,
                    preserveMarkdownCodeBlocks: false,
                    embeddedLanguageFormatting: "off",
                }),
            ).toBe(block);
        }
    },
);

test.each(parsers)("%s fills embedded Markdown in compact layout as usual", async (parser) => {
    const input = "```markdown\n" + header + delimiter + "| text |\n```\n";
    expect(await format(input, { parser, tableLayout: "compact" })).toBe(
        "```markdown\n" + tableHeader("compact") + "|text||||\n```\n",
    );
});

test.each(parsers)("%s delegates aligned tables regardless of filling", async (parser) => {
    const input = header + delimiter + "| text |\n| extra | cells | are | kept | here |\n";
    const expected = await prettier.format(input, { parser });
    for (const tableFillMissingCells of [true, false]) {
        expect(await format(input, { parser, tableLayout: "aligned", tableFillMissingCells })).toBe(
            expected,
        );
    }
});
