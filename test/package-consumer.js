// Executed against an installed tarball by scripts/check-package.js.
import { test, expect } from "vitest";
import { execFileSync } from "node:child_process";
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

test("formats the README with the installed package", async () => {
    const input = readFileSync(join(consumer, "README.md"), "utf8");
    expect(await prettier.format(input, { parser: "markdown", plugins: [plugin] })).toBe(input);
});
