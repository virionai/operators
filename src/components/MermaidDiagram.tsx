import type { Mermaid } from "mermaid";
import { ReactNode, useEffect, useState } from "react";

let mermaidModule: Promise<Mermaid> | null = null;
let renderSequence = 0;

function loadMermaid(): Promise<Mermaid> {
  if (mermaidModule) return mermaidModule;
  mermaidModule = import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "dark",
      fontFamily: "'Space Mono', monospace",
      themeVariables: {
        background: "#070e12",
        primaryColor: "#0d1b24",
        primaryTextColor: "#e1e7e7",
        primaryBorderColor: "#7ba7c9",
        lineColor: "#7ba7c9",
        secondaryColor: "#101c14",
        tertiaryColor: "#0a141b",
        fontSize: "12px",
      },
    });
    return mermaid;
  });
  return mermaidModule;
}

type MermaidDiagramProps = {
  code: string;
  fallback?: ReactNode;
};

export function MermaidDiagram({ code, fallback }: MermaidDiagramProps) {
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = code.trim();
    if (!source) {
      setSvg("");
      setFailed(true);
      return undefined;
    }

    renderSequence += 1;
    const renderId = `mermaid-render-${renderSequence}`;

    void (async () => {
      try {
        const mermaid = await loadMermaid();
        const parsed = await mermaid.parse(source, { suppressErrors: true });
        if (!parsed) throw new Error("invalid mermaid source");
        const { svg: rendered } = await mermaid.render(renderId, source);
        if (!cancelled) {
          setSvg(rendered);
          setFailed(false);
        }
      } catch {
        // Mermaid can leave an orphaned error element behind on a failed render.
        document.getElementById(`d${renderId}`)?.remove();
        if (!cancelled) {
          setSvg("");
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (failed || !svg) {
    if (fallback) return <>{fallback}</>;
    return (
      <pre className="mermaid-source-fallback">
        <code>{code}</code>
      </pre>
    );
  }

  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}
