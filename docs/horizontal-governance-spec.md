# Horizontal Community Governance Spec

> Derived from Partido Migala's organizational principles. Adapted for PARA community governance.

## Context

Partido Migala is a **horizontal political party** in Mexico. Unlike traditional hierarchical communities, they operate under:

- **Democracia directa** — assemblies are the supreme authority
- **Horizontalidad** — no vertical chains of command
- **Rotatividad de cargos** — positions rotate; no permanent ownership
- **Transparencia máxima** — all decisions are public and recorded
- **Revocación en cualquier momento** — any role can be revoked by assembly vote

## Implications for PARA Governance

The current PARA governance model assumes a **hierarchical** structure:

```
owner > moderator > steward > official > member
```

For horizontal communities, this model is **invalid**. We need a new governance mode.

---

## Proposed: `horizontal` Governance Mode

### Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `facilitator` | Temporary assembly facilitator (rotates) | Start/stop deliberations, schedule votes, enforce code of conduct |
| `moderator` | Content moderator (rotates) | Remove spam, hide off-topic posts, timeout users |
| `steward` | Community caretaker (elected, revocable) | Manage infrastructure, invite new members, archive content |
| `member` | Full participant | Vote in assemblies, propose initiatives, delegate |
| `observer` | Non-voting participant | Read, comment, learn |

**Key differences from hierarchical mode:**
- No `owner` role exists
- `facilitator` and `moderator` are **time-bound** and **rotating**
- `steward` is elected by assembly and **revocable at any time**
- All role assignments require assembly ratification

### Decision-Making Rules

| Action | Required Vote | Quorum | Delegation |
|--------|--------------|--------|------------|
| Facilitator rotation | Simple majority | 20% | No |
| Moderator election | Simple majority | 25% | No |
| Steward appointment | 2/3 majority | 40% | No |
| Steward revocation | Simple majority | 30% | No |
| Governance config change | 2/3 majority | 50% | No |
| Community constitution change | 3/4 majority | 60% | No |
| Ordinary proposal | Configurable (default: majority) | 25% | Yes |

**Delegation rules in horizontal mode:**
- Delegation is **opt-in per proposal**
- Max delegation depth: 1 hop
- Delegations expire after each proposal
- No permanent delegates

### Record-Level Authorization

For horizontal communities, governance record authorization must check:

1. **Does the actor hold a currently valid role?**
   - Facilitator/moderator/steward assignments are time-bound
   - Expired roles are rejected

2. **Was the action ratified by assembly vote?**
   - Governance config changes must reference an approved assembly decision
   - The decision record must exist and be valid

3. **Is the role rotation within constraints?**
   - Facilitator: max 30 days per term
   - Moderator: max 90 days per term
   - Steward: max 180 days per term, requires 2/3 majority

### Lexicon Changes

Add to `com.para.community.governanceConfig`:

```json
{
  "governanceMode": {
    "type": "string",
    "knownValues": ["hierarchical", "horizontal"],
    "default": "hierarchical"
  },
  "roleRotationRules": {
    "type": "ref",
    "ref": "#roleRotationRules"
  }
}
```

Add new def `roleRotationRules`:

```json
{
  "type": "object",
  "properties": {
    "facilitatorMaxDays": { "type": "integer", "minimum": 1, "maximum": 90 },
    "moderatorMaxDays": { "type": "integer", "minimum": 1, "maximum": 180 },
    "stewardMaxDays": { "type": "integer", "minimum": 1, "maximum": 365 },
    "requiresAssemblyRatification": { "type": "boolean" }
  }
}
```

### UI Implications

- Community creation flow must ask: "Governance mode: hierarchical or horizontal?"
- Horizontal communities show "Assembly" tab instead of "Admin Dashboard"
- Role badges show expiration dates
- Rotation schedule is public and visible

---

## Moderators in Horizontal Communities

Even horizontal communities need moderators. The difference is **how they are chosen and how long they serve**:

- **Not appointed by owner** (there is no owner)
- **Elected by assembly** for fixed terms
- **Revocable at any time** by assembly vote
- **Rotating** to prevent power concentration
- **Transparency**: all moderator actions are logged and publicly auditable

This preserves the horizontal principle while ensuring the community remains safe and functional.

---

## Reference Document

- `PARA/assets/community-docs/declaracion-de-principios.md` — Full Partido Migala declaration of principles (Spanish)
- `PARA/assets/community-docs/Declaración de principios.docx` — Original document
