export { ScoutCharacter } from './ScoutCharacter';
export { NexusCharacter } from './NexusCharacter';
export { OracleCharacter } from './OracleCharacter';
export { SentinelCharacter } from './SentinelCharacter';

import { ScoutCharacter } from './ScoutCharacter';
import { NexusCharacter } from './NexusCharacter';
import { OracleCharacter } from './OracleCharacter';
import { SentinelCharacter } from './SentinelCharacter';
import { AgentId } from '../types';

export const AgentCharacterMap: Record<AgentId, React.FC<any>> = {
  scout: ScoutCharacter,
  nexus: NexusCharacter,
  oracle: OracleCharacter,
  sentinel: SentinelCharacter,
};
