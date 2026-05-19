import { useEffect } from "react";
import { motion } from "framer-motion";
import { BottomQueue } from "./components/BottomQueue";
import { GemmaPanel } from "./components/GemmaPanel";
import { LeftRail } from "./components/LeftRail";
import { ModeNav } from "./components/ModeNav";
import { SelectionCapture } from "./components/SelectionCapture";
import { TopHud } from "./components/TopHud";
import { WorkspaceCanvas } from "./components/WorkspaceCanvas";
import { loadSnapshot, saveSnapshot } from "./lib/persistence";
import { snapshotFromState, useWorkspaceStore, type PersistedState } from "./store";

export default function App() {
  const hydrateSnapshot = useWorkspaceStore((state) => state.hydrateSnapshot);
  const checkRuntime = useWorkspaceStore((state) => state.checkRuntime);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("fresh")) {
      void checkRuntime();
      return;
    }
    let active = true;
    void loadSnapshot<PersistedState>().then((snapshot) => {
      if (active && snapshot) hydrateSnapshot(snapshot);
      if (active) void checkRuntime();
    });
    return () => {
      active = false;
    };
  }, [checkRuntime, hydrateSnapshot]);

  useEffect(() => {
    const unsubscribe = useWorkspaceStore.subscribe((state) => {
      void saveSnapshot(snapshotFromState(state));
    });
    return unsubscribe;
  }, []);

  return (
    <motion.div className="app-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <TopHud />
      <ModeNav />
      <div className="workspace-shell">
        <LeftRail />
        <WorkspaceCanvas />
        <GemmaPanel />
      </div>
      <BottomQueue />
      <SelectionCapture />
    </motion.div>
  );
}
