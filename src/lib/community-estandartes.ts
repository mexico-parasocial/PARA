/**
 * @deprecated Use `civic-insignias.ts` instead.
 * This file re-exports the unified civic insignia system for backward compatibility.
 */

export {
  type InsigniaColors as EstandarteColors,
  insigniaFromColor as estandarteFromColor,
  getCommunityInsignia as getCommunityEstandarte,
} from '#/lib/civic-insignias'
