import { Fragment, ReactNode } from "react";

type MarkdownRenderProps = {
  text: string;
};

type Block =
  | { kind: "heading"; depth: number; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "list"; items: string[] }
  | { kind: "code"; language: string; code: string }
  | { kind: "table"; rows: string[][] };

const thinkingHeadings = new Set(["operational reasoning", "reasoning", "thinking"]);

const markdownStyles = {
  root: {
    display: "grid",
    gap: "8px",
    color: "#e1e7e7",
    fontFamily: "var(--mono)",
    fontSize: "11px",
    lineHeight: 1.6,
  },
  heading: {
    margin: 0,
    color: "#f3f7f7",
    fontFamily: "var(--mono)",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  paragraph: {
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  list: {
    display: "grid",
    gap: "4px",
    margin: 0,
    paddingLeft: "16px",
  },
  codeShell: {
    overflow: "hidden",
    border: "1px solid rgba(245, 245, 240, 0.08)",
    borderRadius: "4px",
    background: "rgba(3, 10, 16, 0.42)",
  },
  codeLabel: {
    display: "block",
    padding: "5px 8px 0",
    color: "#98a5a8",
    fontFamily: "var(--mono)",
    fontSize: "9px",
    textTransform: "uppercase",
  },
  pre: {
    margin: 0,
    overflowX: "auto",
    padding: "8px",
    color: "#dce7e8",
    fontFamily: "var(--mono)",
    fontSize: "10px",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
  },
  inlineCode: {
    border: "1px solid rgba(245, 245, 240, 0.08)",
    borderRadius: "3px",
    padding: "1px 4px",
    background: "rgba(3, 10, 16, 0.52)",
    color: "#cfe6ff",
    fontFamily: "var(--mono)",
    fontSize: "10px",
  },
  tableShell: {
    maxWidth: "100%",
    overflowX: "auto",
    border: "1px solid rgba(245, 245, 240, 0.08)",
    borderRadius: "4px",
    background: "rgba(3, 10, 16, 0.28)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#dce7e8",
    fontFamily: "var(--mono)",
    fontSize: "10px",
    lineHeight: 1.45,
  },
  tableCell: {
    padding: "6px 8px",
    borderBottom: "1px solid rgba(245, 245, 240, 0.07)",
    textAlign: "left",
    verticalAlign: "top",
  },
  tableHeader: {
    padding: "6px 8px",
    borderBottom: "1px solid rgba(123, 167, 201, 0.22)",
    color: "#f3f7f7",
    fontWeight: 700,
    textAlign: "left",
    verticalAlign: "top",
  },
} as const;

export function hideThinkingSections(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  let hiding = false;

  for (const line of lines) {
    const heading = readHeading(line);

    if (heading) {
      hiding = thinkingHeadings.has(normalizeHeading(heading.text));
      if (hiding) continue;
    }

    if (!hiding) kept.push(line);
  }

  return kept.join("\n").trim();
}

export function MarkdownRender({ text }: MarkdownRenderProps) {
  const blocks = parseBlocks(text);

  return (
    <div className="markdown-render" style={markdownStyles.root}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function renderBlock(block: Block, index: number) {
  if (block.kind === "heading") {
    return renderHeading(block.depth, block.text, index);
  }

  if (block.kind === "list") {
    return (
      <ul key={index} style={markdownStyles.list}>
        {block.items.map((item, itemIndex) => (
          <li key={`${index}-${itemIndex}`}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  if (block.kind === "code") {
    const label = normalizeLanguage(block.language) === "mermaid" ? "Mermaid" : block.language.trim();

    return (
      <div key={index} style={markdownStyles.codeShell}>
        {label ? <small style={markdownStyles.codeLabel}>{label}</small> : null}
        <pre style={markdownStyles.pre}>
          <code>{block.code}</code>
        </pre>
      </div>
    );
  }

  if (block.kind === "table") {
    const [head, ...body] = block.rows;

    return (
      <div key={index} style={markdownStyles.tableShell}>
        <table style={markdownStyles.table}>
          <thead>
            <tr>
              {head.map((cell, cellIndex) => (
                <th key={`${cell}-${cellIndex}`} style={markdownStyles.tableHeader}>{renderInline(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={`${row.join("-")}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} style={markdownStyles.tableCell}>{renderInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <p key={index} style={markdownStyles.paragraph}>
      {renderInline(block.lines.join("\n"))}
    </p>
  );
}

function renderHeading(depth: number, text: string, index: number) {
  const content = renderInline(text);
  const headingDepth = Math.min(depth + 2, 6);

  if (headingDepth === 3) return <h3 key={index} style={markdownStyles.heading}>{content}</h3>;
  if (headingDepth === 4) return <h4 key={index} style={markdownStyles.heading}>{content}</h4>;
  if (headingDepth === 5) return <h5 key={index} style={markdownStyles.heading}>{content}</h5>;

  return <h6 key={index} style={markdownStyles.heading}>{content}</h6>;
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```([A-Za-z0-9_-]*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) index += 1;
      blocks.push({ kind: "code", language: fence[1] ?? "", code: codeLines.join("\n") });
      continue;
    }

    const heading = readHeading(line);
    if (heading) {
      blocks.push({ kind: "heading", depth: heading.depth, text: heading.text });
      index += 1;
      continue;
    }

    if (isBullet(line)) {
      const items: string[] = [];

      while (index < lines.length && isBullet(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }

      blocks.push({ kind: "list", items });
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      const rows: string[][] = [parseMarkdownTableRow(lines[index])];
      index += 2;

      while (index < lines.length && isMarkdownTableRow(lines[index])) {
        rows.push(parseMarkdownTableRow(lines[index]));
        index += 1;
      }

      blocks.push({ kind: "table", rows });
      continue;
    }

    const paragraphLines: string[] = [];

    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].match(/^```/) &&
      !readHeading(lines[index]) &&
      !isBullet(lines[index]) &&
      !isMarkdownTableStart(lines, index)
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    blocks.push({ kind: "paragraph", lines: paragraphLines });
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code key={`${match.index}-code`} style={markdownStyles.inlineCode}>
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <strong key={`${match.index}-strong`}>
          {token.slice(2, -2)}
        </strong>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}

function readHeading(line: string) {
  const hashHeading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
  if (hashHeading) return { depth: hashHeading[1].length, text: hashHeading[2].trim() };

  const boldHeading = line.match(/^\s*\*\*(.+?)\*\*:?\s*$/);
  if (boldHeading) return { depth: 3, text: boldHeading[1].trim() };

  return null;
}

function isBullet(line: string) {
  return /^\s*[-*]\s+\S/.test(line);
}

function isMarkdownTableStart(lines: string[], index: number) {
  return isMarkdownTableRow(lines[index] ?? "") && isMarkdownTableDivider(lines[index + 1] ?? "");
}

function isMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  return trimmed.includes("|") && parseMarkdownTableRow(trimmed).length >= 2;
}

function isMarkdownTableDivider(line: string) {
  const cells = parseMarkdownTableRow(line);
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseMarkdownTableRow(line: string) {
  const cells = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
  return cells.filter((cell) => cell.length > 0);
}

function normalizeHeading(text: string) {
  return text.replace(/[:*`#]/g, "").trim().toLowerCase();
}

function normalizeLanguage(language: string) {
  return language.trim().toLowerCase();
}
