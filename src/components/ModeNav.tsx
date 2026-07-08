import { Bot } from "lucide-react";
import { useWorkspaceStore } from "../store";

const tabs = ["Workspace", "Assets", "Knowledge", "Events"];

export function ModeNav() {
  const activeTab = useWorkspaceStore((state) => state.activeTab);
  const setTab = useWorkspaceStore((state) => state.setTab);
  const setCommandWorkspaceMode = useWorkspaceStore((state) => state.setCommandWorkspaceMode);

  return (
    <nav className="mode-nav" aria-label="Workspace navigation">
      <div className="mode-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? "active" : ""}
            type="button"
            onClick={() => {
              setCommandWorkspaceMode(false);
              setTab(tab);
            }}
          >
            {tab}
          </button>
        ))}
        <button className="agent-nav-button" type="button" onClick={() => setCommandWorkspaceMode(true)}>
          <Bot size={13} />
          Agent
        </button>
      </div>
    </nav>
  );
}
