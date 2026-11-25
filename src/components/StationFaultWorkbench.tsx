import { LabFaultWorkbench } from './LabFaultWorkbench';
import { useSubstationStore } from '../simulation/useSubstationStore';

/** Shared station exercises read equipment effects, not merely the scenario's active flag. */
export function StationFaultWorkbench({ context }: { context: string }) {
  const state = useSubstationStore();
  const bay = (id: string) => state.bays.find(item => item.id === id);
  const lane = (plane: 'LAN_A' | 'LAN_B') => state.networkLinks.filter(link => link.lanPlane === plane);
  const unhealthy: Record<string, boolean> = {
    'FLT-01': bay('BAY-33-F03')?.springCharged === false,
    'FLT-02': bay('BAY-33-F01')?.tcsHealthy === false,
    'FLT-03': bay('BAY-33-F03')?.quality !== 'GOOD',
    'FLT-04': state.gooseControlBlocks.some(block => block.id === 'GOCB-33-F03-CILO' && !block.healthy),
    'FLT-05': state.gooseControlBlocks.some(block => block.id === 'GOCB-132-L1-TRIP' && block.vlanId === 999),
    'FLT-09': bay('BAY-11-F04')?.quality !== 'GOOD',
    'FLT-10': state.infrastructure.some(device => device.id === 'CLK-PTP-GM' && device.status !== 'ONLINE'),
    'FLT-11': lane('LAN_A').length > 0 && lane('LAN_A').every(link => link.status === 'DOWN'),
    'FLT-12': lane('LAN_B').length > 0 && lane('LAN_B').every(link => link.status === 'DOWN'),
  };
  const exercises = state.faultScenarios.filter(fault => fault.id in unhealthy).map(fault => ({
    id: fault.id, label: fault.title, expected: fault.symptoms.join(' '),
    checks: [...fault.diagnostics, fault.correctiveAction, fault.validationCheck],
    active: fault.active, observed: unhealthy[fault.id],
    recovered: !fault.active && !unhealthy[fault.id] && !state.faultScenarios.some(item => item.active),
    evidence: `${fault.targetBayOrIed}: equipment fault ${unhealthy[fault.id] ? 'present' : 'absent'}; ` +
      `F03 spring ${bay('BAY-33-F03')?.springCharged}; F01 TCS ${bay('BAY-33-F01')?.tcsHealthy}; ` +
      `F03 quality ${bay('BAY-33-F03')?.quality}; LAN A down ${lane('LAN_A').filter(link => link.status === 'DOWN').length}/${lane('LAN_A').length}; ` +
      `LAN B down ${lane('LAN_B').filter(link => link.status === 'DOWN').length}/${lane('LAN_B').length}`,
    inject: () => { if (!fault.active) state.toggleFaultScenario(fault.id); },
    clear: () => { if (fault.active) state.toggleFaultScenario(fault.id); },
  }));
  return <LabFaultWorkbench lab={context} target="Shared station - fixed targets named in each exercise" exercises={exercises} />;
}
