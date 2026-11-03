import { test, expect } from "vitest";
import * as prettier from "prettier";
import * as plugin from "../src/index.js";

const layouts = ["fixed", "header", "preserve"];
const parsers = ["markdown", "mdx", "remark"];

async function format(input, options = {}) {
    const config = { parser: "markdown", plugins: [plugin], ...options };
    const result = await prettier.format(input, config);
    expect(await prettier.format(result, config)).toBe(result);
    return result;
}

const example = `| Date       | Version    | Description             | Authors |
| :--: | :------: | :----: | :---: |
| 2026-11-03 | 1.0        | Update documentation    | Team    |
`;

test.each(layouts)("%s formats the requested example", async (tableLayout) => {
    const separators = {
        fixed: "| :---: | :---: | :---: | :---: |",
        header: "| :--: | :-----: | :---------: | :-----: |",
        preserve: "| :--: | :------: | :----: | :---: |",
    };
    expect(await format(example, { tableLayout })).toBe(`| Date | Version | Description | Authors |
${separators[tableLayout]}
| 2026-11-03 | 1.0 | Update documentation | Team |
`);
});

test.each(parsers.flatMap((parser) => layouts.map((tableLayout) => [parser, tableLayout])))(
    "%s supports all alignment markers in %s layout",
    async (parser, tableLayout) => {
        const input = `| Left | Right | Center | None |
| :------ | ------: | :------: | ------ |
| a much longer value | 1 | 2 | 3 |
`;
        const separators = {
            fixed: "| :--- | ---: | :---: | --- |",
            header: "| :--- | ----: | :----: | ---- |",
            preserve: "| :------ | ------: | :------: | ------ |",
        };
        expect(await format(input, { parser, tableLayout })).toBe(`| Left | Right | Center | None |
${separators[tableLayout]}
| a much longer value | 1 | 2 | 3 |
`);
    },
);

test.each([1, 3, 5, 12])("fixed accepts %i hyphens without counting colons", async (length) => {
    const hyphens = "-".repeat(length);
    const input = "| A | B | C | D |\n| :- | -: | :-: | - |\n";
    expect(await format(input, { tableLayout: "fixed", tableSeparatorLength: length })).toBe(
        `| A | B | C | D |\n| :${hyphens} | ${hyphens}: | :${hyphens}: | ${hyphens} |\n`,
    );
});

test.each([0, -1, 1.5, "invalid"])("rejects invalid separator length %s", async (length) => {
    await expect(
        format(example, { tableLayout: "fixed", tableSeparatorLength: length }),
    ).rejects.toThrow(/tableSeparatorLength/);
});

test.each(["compact", "aligned", "header", "preserve"])(
    "separator length has no effect on %s layout",
    async (tableLayout) => {
        expect(await format(example, { tableLayout, tableSeparatorLength: 7 })).toBe(
            await format(example, { tableLayout }),
        );
    },
);

test("header uses at least three positions including colons", async () => {
    const input = "| A | B | | |\n| :- | -: | :-: | - |\n| longer | data | than | headers |\n";
    expect(await format(input, { tableLayout: "header" })).toBe(
        "| A | B | | |\n| :-- | --: | :-: | --- |\n| longer | data | than | headers |\n",
    );
});

test.each([
    ["Résumé", "Résumé", 6],
    ["cafe\u0301", "cafe\u0301", 4],
    ["東京", "東京", 4],
    ["✅✅", "✅✅", 4],
    ["👩🏽‍💻👩🏽‍💻", "👩🏽‍💻👩🏽‍💻", 4],
    ["[Link](https://example.com)", "[Link](https://example.com)", 27],
    ["**bold**", "**bold**", 8],
    ["*italic*", "_italic_", 8],
    ["`code`", "`code`", 6],
    [String.raw`a\|bc`, String.raw`a\|bc`, 5],
])("header measures formatted source width for %s", async (inputHeader, header, width) => {
    const input = `| ${inputHeader} |\n| :---: |\n| much longer body content must not affect width |\n`;
    expect(await format(input, { tableLayout: "header" })).toBe(
        `| ${header} |\n| :${"-".repeat(width - 2)}: |\n| much longer body content must not affect width |\n`,
    );
});

test.each(layouts)(
    "%s preserves escaped pipes, code and inline formatting",
    async (tableLayout) => {
        const input =
            String.raw`| A | B |
| --- | --- |
| a\|b | ` +
            "`x\\|y`" +
            String.raw` |
| **bold** | *italic* |
| [Link](https://example.com) | ` +
            "`` `code` ``" +
            " |\n";
        expect(await format(input, { tableLayout })).toBe(
            String.raw`| A | B |
| --- | --- |
| a\|b | ` +
                "`x\\|y`" +
                String.raw` |
| **bold** | _italic_ |
| [Link](https://example.com) | ` +
                "`` `code` ``" +
                " |\n",
        );
    },
);

test.each(layouts)("%s gives empty cells one space in total", async (tableLayout) => {
    const input = "| | B |\n| --- | --- |\n| x | |\n| | |\n";
    expect(await format(input, { tableLayout })).toBe("| | B |\n| --- | --- |\n| x | |\n| | |\n");
});

test.each(parsers)("preserve reads each table's own separator in %s", async (parser) => {
    const input = `| A | B |
| :- | --------: |

| C | D |
| :--: | ----- |
| x | y |
`;
    expect(await format(input, { tableLayout: "preserve", parser })).toBe(input);
});

test.each([
    ["A | B\n:--: | -----:\nx | y\n", "| A | B |\n| :--: | -----: |\n| x | y |\n"],
    ["|A|B\n|:--:|-----:\n|x|y\n", "| A | B |\n| :--: | -----: |\n| x | y |\n"],
    ["A|B|\n:--:|-----:|\nx|y|\n", "| A | B |\n| :--: | -----: |\n| x | y |\n"],
    ["| A | B |\n| :--: | -----: |", "| A | B |\n| :--: | -----: |\n"],
    [
        "> | A | B |\n> | :--: | -----: |\n> | x | y |\n",
        "> | A | B |\n> | :--: | -----: |\n> | x | y |\n",
    ],
    [
        "- | A | B |\n  | :--: | -----: |\n  | x | y |\n",
        "- | A | B |\n  | :--: | -----: |\n  | x | y |\n",
    ],
    [
        "> - | A | B |\n>   | :--: | -----: |\n>   | x | y |\n",
        "> - | A | B |\n>   | :--: | -----: |\n>   | x | y |\n",
    ],
])("preserve handles source positions for %j", async (input, expected) => {
    for (const parser of parsers) {
        expect(await format(input, { tableLayout: "preserve", parser })).toBe(expected);
    }
});

test.each(layouts)("%s supports CRLF and BOM input", async (tableLayout) => {
    const input = "\uFEFF| A | B |\r\n| --- | --- |\r\n| 1 | 2 |\r\n";
    expect(await format(input, { tableLayout, endOfLine: "crlf" })).toBe(input);
});

test.each(layouts)("%s honors prettier-ignore and prettier-ignore ranges", async (tableLayout) => {
    const ignored = "| A    | B |\n| :----: | --: |\n| 1 |  2  |\n";
    const input = `<!-- prettier-ignore -->\n${ignored}\n<!-- prettier-ignore-start -->\n\n${ignored}\n<!-- prettier-ignore-end -->\n`;
    expect(await format(input, { tableLayout })).toBe(input);
});

test.each(layouts)(
    "%s formats prose normally and leaves plain code blocks alone",
    async (tableLayout) => {
        const code = "| A   | B |\n| :---: | --: |\n| 1 | 2 |\n";
        const input = `#    Heading\n\n*italic*   text\n\n\`\`\`text\n${code}\`\`\`\n\n${example}`;
        const result = await format(input, { tableLayout });
        expect(result).toBe(
            `# Heading\n\n_italic_ text\n\n\`\`\`text\n${code}\`\`\`\n\n${await format(example, { tableLayout })}`,
        );
    },
);

test.each(layouts)(
    "%s leaves markdown examples intact with embedded formatting off",
    async (tableLayout) => {
        const input = "```markdown\n" + example + "```\n";
        expect(await format(input, { tableLayout, embeddedLanguageFormatting: "off" })).toBe(input);
    },
);

test.each(layouts)("%s preserves Markdown code blocks by default", async (tableLayout) => {
    const content = "\n#   Title  \n\n" + example + " \n";
    for (const parser of parsers) {
        for (const language of ["markdown", "md", "mdx", "pandoc", "mkdn", "Markdown"]) {
            const code = "```" + language + "\n" + content + "```\n";
            const input = code + "\n" + example;
            expect(await format(input, { tableLayout, parser })).toBe(
                code + "\n" + (await format(example, { tableLayout, parser })),
            );
        }
    }
});

test.each(layouts)("%s preserves code content in containers", async (tableLayout) => {
    const lines = ["```markdown", "#   Title  ", "", ...example.trimEnd().split("\n"), "```"];
    for (const parser of parsers) {
        for (const [first, rest] of [
            ["> ", "> "],
            ["- ", "  "],
            ["> - ", ">   "],
        ]) {
            const input =
                lines.map((line, index) => (index === 0 ? first : rest) + line).join("\n") + "\n";
            expect(await format(input, { tableLayout, parser })).toBe(input);
        }
    }
});

test.each(layouts)(
    "%s can format Markdown examples when preservation is disabled",
    async (tableLayout) => {
        for (const parser of parsers) {
            const result = await format("```markdown\n" + example + "```\n", {
                tableLayout,
                parser,
                preserveMarkdownCodeBlocks: false,
            });
            expect(result).toBe(
                "```markdown\n" + (await format(example, { tableLayout, parser })) + "```\n",
            );
            expect(
                await format("```markdown\n" + example + "```\n", {
                    tableLayout,
                    parser,
                    preserveMarkdownCodeBlocks: false,
                    embeddedLanguageFormatting: "off",
                }),
            ).toBe("```markdown\n" + example + "```\n");
        }
    },
);

test.each(layouts)("%s still formats code in other languages", async (tableLayout) => {
    const input = "```js\nconst x={a:1}\n```\n";
    const expected = await prettier.format(input, { parser: "markdown" });
    expect(await format(input, { tableLayout })).toBe(expected);
});

test.each(["compact", "aligned"])(
    "%s keeps its original embedded formatting",
    async (tableLayout) => {
        const input = "```markdown\n" + example + "```\n";
        const expected = "```markdown\n" + (await format(example, { tableLayout })) + "```\n";
        for (const preserveMarkdownCodeBlocks of [true, false]) {
            expect(await format(input, { tableLayout, preserveMarkdownCodeBlocks })).toBe(expected);
        }
    },
);

test.each(layouts)("%s does not expand separators at narrow print widths", async (tableLayout) => {
    const result = await format(example, { tableLayout });
    for (const proseWrap of ["always", "never", "preserve"]) {
        expect(await format(example, { tableLayout, printWidth: 10, proseWrap })).toBe(result);
    }
});

test.each(["compact", "aligned"])("%s retains its existing output", async (tableLayout) => {
    const input = "| A | B |\n| :- | -: |\n| long text | 2 |\n";
    const expected =
        tableLayout === "compact"
            ? "|A|B|\n|:-|-:|\n|long text|2|\n"
            : await prettier.format(input, { parser: "markdown" });
    expect(await format(input, { tableLayout })).toBe(expected);
    if (tableLayout === "compact") {
        expect(await format(input)).toBe(expected);
    }
});
