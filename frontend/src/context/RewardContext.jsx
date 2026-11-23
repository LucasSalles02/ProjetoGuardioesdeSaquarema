import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import RewardCelebration from "../components/RewardCelebration";
import { earnedReward } from "../services/rewards";

const RewardContext = createContext(null);

export function RewardProvider({ children }) {
  const { user } = useAuth();
  return (
    <RewardController key={user?.id || "guest"} user={user}>
      {children}
    </RewardController>
  );
}

function RewardController({ user, children }) {
  const [queue, setQueue] = useState([]);
  const sequence = useRef(0);
  const celebrate = useCallback(
    (result, title = "Boa descoberta, guardião!") => {
      const reward = earnedReward(user, result, title);
      if (!reward) return;
      sequence.current += 1;
      setQueue((current) => [...current, { ...reward, id: sequence.current }]);
    },
    [user],
  );
  const dismiss = useCallback(() => setQueue((current) => current.slice(1)), []);
  const value = useMemo(() => ({ celebrate }), [celebrate]);
  return (
    <RewardContext.Provider value={value}>
      {children}
      {queue[0] && <RewardCelebration key={queue[0].id} reward={queue[0]} onClose={dismiss} />}
    </RewardContext.Provider>
  );
}

export function useReward() {
  const context = useContext(RewardContext);
  if (!context) throw new Error("useReward precisa de RewardProvider.");
  return context;
}
