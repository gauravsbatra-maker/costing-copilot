import type { Budget } from './costing';
import type { Requirements } from './brief';
import type { Basis, RangedProposal } from './proposal';
import type { ContingencyResult } from './contingency';
import type { LineEdit } from './lineEdits';
export type SavedCosting = {
  version: 1; brief: string; budget: Budget; requirements: Requirements; drivers: Record<string,string>;
  state: { lineEdits: Record<string,LineEdit>; pastTransferGuestsEntry: string; bases: Record<string,Basis>; overrides: Record<number,number|null>; useBriefRooms: boolean; confirmed: boolean; generated: {signature:string;proposal:RangedProposal}; chosenVariance:string };
  defaults: Record<string,number>; contingencies: Record<string,number>; lines: RangedProposal; priced: ContingencyResult;
  total: string;
};
// A saved copy contains parsed costing rows and reviewed values, never workbook bytes.
export function readSavedCosting(json: string): SavedCosting {
  if (json.length > 800000) throw new Error('This costing is too large to save.');
  const s = JSON.parse(json);
  const keys = ['version','brief','budget','requirements','drivers','state','total','defaults','contingencies','lines','priced'];
  if (!s || Object.keys(s).some(k=>!keys.includes(k)) || s.version!==1 || typeof s.brief!=='string' || s.brief.length>16000 || !s.defaults || !s.contingencies || !Array.isArray(s.lines?.heads) || !s.priced?.total || typeof s.total!=='string' || !s.total.startsWith('Pre-GST total') || !Array.isArray(s.budget?.heads) || s.budget.heads.length!==10 || !s.requirements?.fields || !s.drivers || !s.state?.generated?.proposal?.heads || typeof s.state.generated.signature!=='string' || typeof s.state.pastTransferGuestsEntry!=='string' || !s.state.lineEdits || !s.state.bases || !s.state.overrides || typeof s.state.useBriefRooms!=='boolean' || typeof s.state.confirmed!=='boolean' || typeof s.state.chosenVariance!=='string') throw new Error('This saved costing is incomplete.');
  return s as SavedCosting;
}
