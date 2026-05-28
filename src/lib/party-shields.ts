/**
 * @deprecated Use `civic-insignias.ts` instead.
 * This file re-exports the unified civic insignia system for backward compatibility.
 */

export {
  createDisplayRichText,
  extractPartyInsignia as extractPartyShield,
  hasPartyPrefix,
  type CivicInsigniaInfo as PartyShieldInfo,
} from '#/lib/civic-insignias'
