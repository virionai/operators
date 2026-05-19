import { Activity, Brain, CheckCircle2, ChevronUp, CircleDot } from "lucide-react";
import { useState } from "react";
import { useWorkspaceStore } from "../store";

export function BottomQueue() {
  const activeAnalysis = useWorkspaceStore((state) => state.activeAnalysis);
  const [expanded, setExpanded] = useState(false);

  return (
    <footer className={`bottom-queue ${expanded ? "expanded" : ""}`} aria-label="Gemma active analysis queue">
      <section className="analysis-lane">
        <div className="queue-heading">
          <Brain size={18} />
          <div>
            <h2>Gemma Active Analysis Queue</h2>
            <small>{activeAnalysis.length} local tasks</small>
          </div>
          <button type="button" onClick={() => setExpanded((value) => !value)} aria-label="Expand active analysis queue">
            <ChevronUp size={15} />
          </button>
        </div>
        <div className="analysis-items">
          {activeAnalysis.length > 0 ? (
            activeAnalysis.map((task) => (
              <article className={`analysis-item ${task.status}`} key={task.id} title={`${task.label} · ${task.source} · ${task.confidence}% confidence`}>
                {task.status === "complete" ? <CheckCircle2 size={15} /> : task.status === "active" ? <Activity size={15} /> : <CircleDot size={15} />}
                <span>
                  <strong>{task.label}</strong>
                  <small>{task.source} · {task.confidence}% confidence</small>
                </span>
                <b style={{ "--progress": `${task.progress}%` } as React.CSSProperties} />
              </article>
            ))
          ) : (
            <article className="analysis-item idle" title="No active local analysis">
              <CircleDot size={15} />
              <span>
                <strong>Idle</strong>
                <small>No active local analysis</small>
              </span>
              <b style={{ "--progress": "0%" } as React.CSSProperties} />
            </article>
          )}
        </div>
        <p className="demo-disclosure">
          Operators v0.1.0 Capsules-protocol v0.6. This harness was developed by virion.ai as a demo for capsules.run, an open source protocol developed by virion.ai. No warranties.
        </p>
      </section>
    </footer>
  );
}
