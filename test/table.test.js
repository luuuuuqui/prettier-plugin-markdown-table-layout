import { test, expect } from "vitest";
import * as prettier from "prettier";
import * as plugin from "../src/index.js";

async function format(input, options = {}) {
    return prettier.format(input, {
        parser: "markdown",
        plugins: [plugin],
        tableLayout: "compact",
        ...options,
    });
}

test("basic compact table", async () => {
    const input = `| Name  | Age | City |
| ----- | --- | ---- |
| Alice | 30  | NYC  |
| Bob   | 25  | LA   |
`;
    const expected = `|Name|Age|City|
|-|-|-|
|Alice|30|NYC|
|Bob|25|LA|
`;
    expect(await format(input)).toBe(expected);
});

test("aligned table preserves Prettier default", async () => {
    const input = `|Name|Age|City|
|-|-|-|
|Alice|30|NYC|
|Bob|25|LA|
`;
    const expected = `| Name  | Age | City |
| ----- | --- | ---- |
| Alice | 30  | NYC  |
| Bob   | 25  | LA   |
`;
    expect(await format(input, { tableLayout: "aligned" })).toBe(expected);
});

test("alignment markers in compact mode", async () => {
    const input = `| Name | Age | City |
| :--- | :---: | ---: |
| Alice | 30 | NYC |
`;
    const expected = `|Name|Age|City|
|:-|:-:|-:|
|Alice|30|NYC|
`;
    expect(await format(input)).toBe(expected);
});

test("empty cells in compact mode", async () => {
    const input = `| A | B |
| - | - |
|   | x |
`;
    const expected = `|A|B|
|-|-|
||x|
`;
    expect(await format(input)).toBe(expected);
});

test("CJK content handled correctly", async () => {
    const input = `| Name | City |
| --- | --- |
| Alice | 東京 |
`;
    const expected = `|Name|City|
|-|-|
|Alice|東京|
`;
    expect(await format(input)).toBe(expected);
});

test("single column table", async () => {
    const input = `| a |
| - |
| b |
`;
    const expected = `|a|
|-|
|b|
`;
    expect(await format(input)).toBe(expected);
});

test("table with inline formatting", async () => {
    const input = `| Style | Example |
| --- | --- |
| bold | **text** |
| italic | *text* |
| code | \`text\` |
`;
    const expected = `|Style|Example|
|-|-|
|bold|**text**|
|italic|_text_|
|code|\`text\`|
`;
    expect(await format(input)).toBe(expected);
});

test("escaped pipes inside cells", async () => {
    const input = `| A | B |
| - | - |
| a\\|b | c |
`;
    const expected = `|A|B|
|-|-|
|a\\|b|c|
`;
    expect(await format(input)).toBe(expected);
});

test("mdx parser produces compact table", async () => {
    const input = `| A | B |
| --- | --- |
| 1 | 2 |
`;
    const expected = `|A|B|
|-|-|
|1|2|
`;
    expect(await format(input, { parser: "mdx" })).toBe(expected);
});

test("aligned delegates wide tables at narrow print widths to Prettier", async () => {
    const columns = Array.from({ length: 10 }, (_, i) => `Column${i}`);
    const values = Array.from({ length: 10 }, (_, i) => `Value${i}Padding`);
    const input = `| ${columns.join(" | ")} |
| ${columns.map(() => "---").join(" | ")} |
| ${values.join(" | ")} |
`;
    const options = {
        proseWrap: "never",
        printWidth: 40,
    };
    expect(await format(input, { tableLayout: "aligned", ...options })).toBe(
        await prettier.format(input, { parser: "markdown", ...options }),
    );
});
