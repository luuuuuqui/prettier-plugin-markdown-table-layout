import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const prettierVersion = process.argv[2] ?? "3";
assert.match(prettierVersion, /^3(?:\.\d+){0,2}$/, "Choose a version from the Prettier 3 series.");

// Keep temporary installs inside this checkout and outside normal test discovery.
const workspace = mkdtempSync(join(projectRoot, "node_modules/.package-check-"));
const consumer = join(workspace, "consumer");
const npmCli =
    process.platform === "win32"
        ? join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js")
        : null;

function runNpm(args, cwd) {
    return execFileSync(npmCli ? process.execPath : "npm", npmCli ? [npmCli, ...args] : args, {
        cwd,
        encoding: "utf8",
        env: { ...process.env, npm_config_cache: join(workspace, ".npm-cache") },
    });
}

try {
    const metadata = JSON.parse(
        runNpm(
            ["pack", "--ignore-scripts", "--json", "--pack-destination", workspace],
            projectRoot,
        ),
    );
    const packed = Array.isArray(metadata) ? metadata[0] : Object.values(metadata)[0];
    assert.deepEqual(
        packed.files.map(({ path }) => path).sort(),
        [
            "LICENSE.txt",
            "README.md",
            "package.json",
            "src/index.js",
            "src/options.js",
            "src/print-compact-table.js",
        ].sort(),
        "The package should contain only its release files.",
    );

    mkdirSync(consumer);
    writeFileSync(
        join(consumer, "package.json"),
        JSON.stringify({ name: "plugin-consumer", private: true, type: "module" }),
        "utf8",
    );
    console.log(
        runNpm(
            [
                "install",
                "--ignore-scripts",
                "--no-audit",
                "--no-fund",
                "--package-lock=false",
                "--save-exact",
                join(workspace, packed.filename),
                `prettier@${prettierVersion}`,
            ],
            consumer,
        ),
    );
    const installedPrettier = JSON.parse(
        readFileSync(join(consumer, "node_modules/prettier/package.json"), "utf8"),
    ).version;
    console.log(`Checking the installed package with Prettier ${installedPrettier}.`);

    const testDirectory = join(consumer, "test");
    mkdirSync(testDirectory);
    for (const file of readdirSync(join(projectRoot, "test"))) {
        if (!file.endsWith(".test.js")) continue;
        const source = readFileSync(join(projectRoot, "test", file), "utf8");
        writeFileSync(
            join(testDirectory, file),
            source.replaceAll('"../src/index.js"', '"prettier-plugin-markdown-table-layout"'),
            "utf8",
        );
    }
    writeFileSync(
        join(testDirectory, "package-consumer.test.js"),
        readFileSync(join(projectRoot, "test/package-consumer.js")),
    );
    writeFileSync(
        join(consumer, ".prettierrc.json"),
        JSON.stringify({ plugins: ["prettier-plugin-markdown-table-layout"] }),
        "utf8",
    );
    writeFileSync(join(consumer, "README.md"), readFileSync(join(projectRoot, "README.md")));

    execFileSync(
        process.execPath,
        [
            join(dirname(require.resolve("vitest/package.json")), "vitest.mjs"),
            "run",
            "--root",
            consumer,
        ],
        {
            cwd: consumer,
            stdio: "inherit",
            env: {
                ...process.env,
                PACKAGE_CHECK_ROOT: consumer,
                PACKAGE_CHECK_PRETTIER_VERSION: prettierVersion,
            },
        },
    );
} finally {
    rmSync(workspace, { recursive: true });
}
