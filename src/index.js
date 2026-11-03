import * as prettierMarkdownPlugin from "prettier/plugins/markdown";
import { builders, utils } from "prettier/doc";
import { printCompactTable } from "./print-compact-table.js";
import options from "./options.js";

const originalPrinter = prettierMarkdownPlugin.printers.mdast;
const markdownCodeLanguages = new Set(
    prettierMarkdownPlugin.languages.flatMap(({ name, aliases = [], extensions = [] }) => [
        name.toLowerCase(),
        ...aliases,
        ...extensions.map((extension) => extension.slice(1)),
    ]),
);

function shouldPreserveMarkdownCodeBlock(path, options) {
    return (
        options.tableLayout !== "compact" &&
        options.tableLayout !== "aligned" &&
        options.preserveMarkdownCodeBlocks &&
        path.node.type === "code" &&
        markdownCodeLanguages.has(path.node.lang?.toLowerCase())
    );
}

export const parsers = {
    markdown: prettierMarkdownPlugin.parsers.markdown,
    mdx: prettierMarkdownPlugin.parsers.mdx,
    remark: prettierMarkdownPlugin.parsers.remark,
};

export const printers = {
    mdast: {
        ...originalPrinter,
        embed(path, options) {
            if (shouldPreserveMarkdownCodeBlock(path, options)) {
                return undefined;
            }
            return originalPrinter.embed(path, options);
        },
        print(path, options, print) {
            if (path.node.type === "table" && options.tableLayout !== "aligned") {
                return printCompactTable(path, options, print);
            }
            const doc = originalPrinter.print(path, options, print);
            if (shouldPreserveMarkdownCodeBlock(path, options)) {
                // Literal lines retain trailing spaces; the root marker retains container indentation.
                return utils.mapDoc(doc, (part) =>
                    part.type === "line" && part.hard
                        ? builders.markAsRoot(builders.literalline)
                        : part,
                );
            }
            return doc;
        },
    },
};

export { options };
