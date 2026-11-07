import { useEffect } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';

export function useSimulationLoop(): void {
  const simulationRunning = useSubstationStore((s) => s.simulationRunning);
  const stepSimulationTick = useSubstationStore((s) => s.stepSimulationTick);

  useEffect(() => {
    if (!simulationRunning) return;
    const timer = window.setInterval(() => {
      stepSimulationTick();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [simulationRunning, stepSimulationTick]);
}
