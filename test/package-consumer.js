// Executed against an installed tarball by scripts/check-package.js.
import { test, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import * as prettier from "prettier";
import * as plugin from "prettier-plugin-markdown-table-layout";

const require = createRequire(import.meta.url);
const consumer = process.env.PACKAGE_CHECK_ROOT;

test("loads the installed plugin and requested Prettier version", () => {
    const requested = process.env.PACKAGE_CHECK_PRETTIER_VERSION;
    const requestedParts = requested.split(".");
    expect(prettier.version.split(".").slice(0, requestedParts.length)).toEqual(requestedParts);
    expect(realpathSync(require.resolve("prettier-plugin-markdown-table-layout"))).toContain(
        consumer,
    );
    expect(realpathSync(require.resolve("prettier"))).toContain(consumer);
});

test("loads the installed plugin by name from the CLI config", () => {
    const input = "| name | status |\n| :------ | :------ |\n| alice | ready |\n";
    const expected = "| name | status |\n| :--- | :--- |\n| alice | ready |\n";
    const cli = join(dirname(require.resolve("prettier/package.json")), "bin/prettier.cjs");
    const result = execFileSync(
        process.execPath,
        [cli, "--with-node-modules", "--stdin-filepath", "sample.md"],
        { cwd: consumer, input, encoding: "utf8" },
    );
    expect(result).toBe(expected);
});

test("fills short rows from the CLI and accepts the opt-out flag", () => {
    const input = "| actor | system |\n| :--- | ---: |\n| returns |\n";
    const expected = "| actor | system |\n| :--- | ---: |\n| returns | |\n";
    const cli = join(dirname(require.resolve("prettier/package.json")), "bin/prettier.cjs");
    const args = [
        cli,
        "--with-node-modules",
        "--stdin-filepath",
        "sample.md",
        "--plugin",
        "prettier-plugin-markdown-table-layout",
    ];
    const options = { cwd: consumer, input, encoding: "utf8" };
    for (const [flags, output] of [
        [[], expected],
        [["--no-table-fill-missing-cells"], input],
    ]) {
        const result = spawnSync(process.execPath, [...args, ...flags], options);
        expect(result.status).toBe(0);
        expect(result.stderr).toBe("");
        expect(result.stdout).toBe(output);
    }
});

test("formats the README with the installed package", async () => {
    const input = readFileSync(join(consumer, "README.md"), "utf8");
    expect(
        await prettier.format(input, {
            parser: "markdown",
            plugins: [plugin],
            endOfLine: "auto",
        }),
    ).toBe(input);
});
