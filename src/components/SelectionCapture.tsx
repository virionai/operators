import { useEffect, useState } from "react";
import { useWorkspaceStore } from "../store";

type CaptureState = {
  text: string;
  x: number;
  y: number;
};

export function SelectionCapture() {
  const addContextSnippet = useWorkspaceStore((state) => state.addContextSnippet);
  const [capture, setCapture] = useState<CaptureState | null>(null);

  useEffect(() => {
    function onSelection() {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!selection || !text || text.length < 8 || selection.rangeCount === 0) {
        setCapture(null);
        return;
      }
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setCapture({
        text,
        x: Math.min(window.innerWidth - 190, Math.max(16, rect.left + rect.width / 2 - 86)),
        y: Math.max(86, rect.top - 42),
      });
    }

    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  if (!capture) return null;

  return (
    <button
      className="selection-capsule"
      style={{ left: capture.x, top: capture.y }}
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        addContextSnippet(capture.text, "selected text");
        window.getSelection()?.removeAllRanges();
        setCapture(null);
      }}
    >
      + Add to Context
    </button>
  );
}
