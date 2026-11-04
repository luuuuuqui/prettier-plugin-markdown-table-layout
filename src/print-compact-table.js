import { builders, printer as docPrinter } from "prettier/doc";
import { util } from "prettier";

const { breakParent, hardlineWithoutBreakParent, join } = builders;
const { printDocToString } = docPrinter;

function printCompactTable(path, options, print) {
    const { node } = path;
    if (
        options.tableLayout === "fixed" &&
        (!Number.isInteger(options.tableSeparatorLength) || options.tableSeparatorLength < 1)
    ) {
        throw new RangeError("tableSeparatorLength must be a positive integer.");
    }

    const contents = path.map(
        () => path.map(() => printDocToString(print(), options).formatted, "children"),
        "children",
    );

    if (options.tableFillMissingCells) {
        const columnCount = contents[0].length;
        for (const row of contents.slice(1)) {
            while (row.length < columnCount) {
                row.push("");
            }
        }
    }

    const rows = [
        contents[0],
        printSeparator(node, options, contents[0]),
        ...contents.slice(1),
    ].map((columns) => {
        if (options.tableLayout === "compact") {
            return `|${columns.join("|")}|`;
        }
        return `|${columns.map((text) => (text ? ` ${text} ` : " ")).join("|")}|`;
    });

    return [breakParent, join(hardlineWithoutBreakParent, rows)];
}

function printSeparator(node, options, headers) {
    const preservedLengths =
        options.tableLayout === "preserve" ? getSeparatorLengths(node, options.originalText) : [];
    return node.align
        .map((align, index) => {
            if (options.parser !== "mdx" && index >= headers.length) {
                return null;
            }
            const left = align === "center" || align === "left" ? ":" : "";
            const right = align === "center" || align === "right" ? ":" : "";
            let length = 1;
            if (options.tableLayout === "fixed") {
                length = options.tableSeparatorLength;
            } else if (options.tableLayout === "header") {
                const width = Math.max(3, util.getStringWidth(headers[index] ?? ""));
                length = width - left.length - right.length;
            } else if (options.tableLayout === "preserve") {
                length = preservedLengths[index];
            }
            return `${left}${"-".repeat(length)}${right}`;
        })
        .filter(Boolean);
}

function getSeparatorLengths(node, originalText) {
    // The AST omits the delimiter row. Read only that line, after the header's source span.
    // Matching hyphen runs also handles optional outer pipes, indentation and block quotes.
    const start = originalText.indexOf("\n", node.children[0].position.end.offset) + 1;
    const newline = originalText.indexOf("\n", start);
    const end = newline === -1 ? node.position.end.offset : newline;
    return originalText
        .slice(start, end)
        .match(/-+/g)
        .map((hyphens) => hyphens.length);
}

export { printCompactTable };
