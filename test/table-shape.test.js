import { test, expect } from "vitest";
import * as prettier from "prettier";
import * as plugin from "../src/index.js";

const parsers = ["markdown", "mdx", "remark"];
const layouts = ["compact", "fixed", "header", "preserve"];
const combinations = parsers.flatMap((parser) =>
    layouts.map((tableLayout) => [parser, tableLayout]),
);

async function format(input, options) {
    const config = { plugins: [plugin], ...options };
    const output = await prettier.format(input, config);
    expect(await prettier.format(output, config)).toBe(output);
    return output;
}

const header = "| Alpha | Beta |\n";
const delimiter = "| :------- | ----: |\n";
const separators = {
    compact: "|:-|-:|\n",
    fixed: "| :--- | ---: |\n",
    header: "| :---- | ---: |\n",
    preserve: delimiter,
};
const tableHeader = (layout) =>
    (layout === "compact" ? "|Alpha|Beta|\n" : header) + separators[layout];

test.each(combinations)(
    "%s removes only trailing empty surplus cells in %s layout",
    async (parser, tableLayout) => {
        const input =
            header +
            delimiter +
            "| a | b | |    |\n" +
            "| a | | | |\n" +
            "| | | | |\n" +
            "| a | b | note | |\n" +
            "| a | b | | note | |\n" +
            "| a | b | ` ` | |\n" +
            "| a | b | café 👩🏽‍💻 a\\|b | |\n" +
            "| short |\n";
        const body =
            tableLayout === "compact"
                ? "|a|b|\n|a||\n|||\n|a|b|note|\n|a|b||note|\n|a|b|` `|\n|a|b|café 👩🏽‍💻 a\\|b|\n"
                : "| a | b |\n| a | |\n| | |\n| a | b | note |\n| a | b | | note |\n| a | b | ` ` |\n| a | b | café 👩🏽‍💻 a\\|b |\n";
        for (const tableFillMissingCells of [true, false]) {
            const short =
                tableLayout === "compact"
                    ? tableFillMissingCells
                        ? "|short||\n"
                        : "|short|\n"
                    : tableFillMissingCells
                      ? "| short | |\n"
                      : "| short |\n";
            expect(await format(input, { parser, tableLayout, tableFillMissingCells })).toBe(
                tableHeader(tableLayout) + body + short,
            );
        }
    },
);

test.each(combinations)(
    "%s retains empty header columns and their body cells in %s layout",
    async (parser, tableLayout) => {
        const input = "| Alpha | Beta | |\n| :------- | ----: | :------: |\n| a | | | | |\n";
        const expected =
            tableLayout === "compact"
                ? "|Alpha|Beta||\n|:-|-:|:-:|\n|a|||\n"
                : "| Alpha | Beta | |\n" +
                  {
                      fixed: "| :--- | ---: | :---: |\n",
                      header: "| :---- | ---: | :-: |\n",
                      preserve: "| :------- | ----: | :------: |\n",
                  }[tableLayout] +
                  "| a | | |\n";
        expect(await format(input, { parser, tableLayout })).toBe(expected);
    },
);

test.each(combinations)(
    "%s caps recognized table delimiters at the header width in %s layout",
    async (parser, tableLayout) => {
        const surplusDelimiter = "| :------- | ----: | :---------: | ---------- |\n";
        for (const body of ["", "| a | b |\n", "| a | b | |\n", "| a | b | note |\n"]) {
            const input = header + surplusDelimiter + body;
            const ast = await plugin.parsers[parser].parse(input, { parser });
            const table = ast.children.find((node) => node.type === "table");
            if (!table) {
                // Strict parsers can reject a header/delimiter column mismatch as a table.
                expect(await format(input, { parser, tableLayout })).toBe(
                    await prettier.format(input, { parser }),
                );
                continue;
            }
            const expectedBody =
                body === ""
                    ? ""
                    : body.includes("note")
                      ? tableLayout === "compact"
                          ? "|a|b|note|\n"
                          : "| a | b | note |\n"
                      : tableLayout === "compact"
                        ? "|a|b|\n"
                        : "| a | b |\n";
            for (const tableFillMissingCells of [true, false]) {
                expect(await format(input, { parser, tableLayout, tableFillMissingCells })).toBe(
                    tableHeader(tableLayout) + expectedBody,
                );
            }
        }
    },
);

test.each(combinations)(
    "%s normalizes surplus cells in containers and respects ignored content in %s layout",
    async (parser, tableLayout) => {
        const input = header + delimiter + "| a | b | |\n";
        const expected =
            tableHeader(tableLayout) + (tableLayout === "compact" ? "|a|b|\n" : "| a | b |\n");
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
        const ignored = "<!-- prettier-ignore -->\n" + input;
        expect(await format(ignored, { parser, tableLayout })).toBe(ignored);
        const range =
            "<!-- prettier-ignore-start -->\n\n" + input + "\n<!-- prettier-ignore-end -->\n";
        expect(await format(range, { parser, tableLayout })).toBe(range);
        for (const language of ["markdown", "mdx"]) {
            const block = "```" + language + "\n" + input + "```\n";
            expect(await format(block, { parser, tableLayout })).toBe(
                tableLayout === "compact" ? "```" + language + "\n" + expected + "```\n" : block,
            );
            expect(
                await format(block, {
                    parser,
                    tableLayout,
                    preserveMarkdownCodeBlocks: false,
                }),
            ).toBe("```" + language + "\n" + expected + "```\n");
        }
    },
);

test.each(parsers)("%s keeps aligned surplus-cell handling delegated", async (parser) => {
    for (const input of [
        header + delimiter + "| a | b | |\n",
        header + "| :------- | ----: | :------: |\n| a | b |\n",
    ]) {
        expect(await format(input, { parser, tableLayout: "aligned" })).toBe(
            await prettier.format(input, { parser }),
        );
    }
});
