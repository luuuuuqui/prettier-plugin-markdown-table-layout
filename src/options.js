const options = {
    tableLayout: {
        type: "choice",
        category: "Markdown",
        default: "fixed",
        description: "Table formatting style.",
        choices: [
            { value: "compact", description: "No cell padding, minimal separators." },
            { value: "aligned", description: "Pad cells to align columns (Prettier default)." },
            { value: "fixed", description: "Single-space padding, fixed separator hyphen count." },
            { value: "header", description: "Single-space padding, separators sized to headers." },
            {
                value: "preserve",
                description: "Single-space padding, preserve separator hyphen counts.",
            },
        ],
    },
    tableSeparatorLength: {
        type: "int",
        category: "Markdown",
        default: 3,
        description: "Number of separator hyphens per column when tableLayout is fixed.",
        range: { start: 1, end: Infinity, step: 1 },
    },
    preserveMarkdownCodeBlocks: {
        type: "boolean",
        category: "Markdown",
        default: true,
        description: "Preserve Markdown code block content in fixed, header, and preserve layouts.",
    },
};

export default options;
