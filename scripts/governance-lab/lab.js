import {evaluateElection, quadraticCost} from '/assets/engine.js'
import {demoElection, demoEvents} from '/assets/fixtures.js'

const el = id => document.getElementById(id)
const name = id =>
  id.replace('demo:', '').replace(/^./, char => char.toUpperCase())
let events = structuredClone(demoEvents)
let time = 10000
let signal = 2
let snapshot = evaluateElection(demoElection, events, time)

function option(value, label) {
  const node = document.createElement('option')
  node.value = value
  node.textContent = label
  return node
}
el('actor').replaceChildren(
  ...demoElection.participants.map(id => option(id, name(id))),
)
el('proposal').replaceChildren(
  ...demoElection.proposals.map(p => option(p.id, p.label)),
)
for (let value = -3; value <= 3; value++) {
  const button = document.createElement('button')
  button.textContent = value > 0 ? `+${value}` : String(value)
  button.setAttribute(
    'aria-label',
    value === 0
      ? 'Abstención explícita, 0 créditos'
      : `${value > 0 ? 'A favor' : 'En contra'}, intensidad ${Math.abs(value)}, ${quadraticCost(value)} créditos`,
  )
  button.dataset.signal = String(value)
  button.addEventListener('click', () => {
    signal = value
    render()
  })
  el('signals').append(button)
}

const messages = {
  BudgetExceeded: `No se guardó el cambio: alguna persona excedería sus ${demoElection.creditsPerParticipant} créditos entre propuestas. Reduce la intensidad o revisa los otros votos.`,
  AmbiguousDelegation:
    'Ya tienes una delegación en ese ámbito. Retírala antes de registrar otra.',
  InvalidRevocation:
    'Esta delegación ya no se puede retirar desde esta persona.',
}
function feedback(text, error = false) {
  el('feedback').textContent = text
  el('feedback').classList.toggle('error', error)
}

function submit(payload) {
  if (snapshot.phase === 'closed') {
    feedback(
      'La elección está cerrada. Reinicia la demo para empezar otra.',
      true,
    )
    return
  }
  const sequence = events.length + 1
  const nextTime = time + 1
  const candidate = [
    ...events,
    {
      id: `demo:event-${sequence}`,
      election: demoElection.id,
      actor: el('actor').value,
      sequence,
      acceptedAt: nextTime,
      ...payload,
    },
  ]
  try {
    const result = evaluateElection(demoElection, candidate, nextTime)
    events = candidate
    time = nextTime
    snapshot = result
    feedback(
      `Cambio de prueba aceptado · revisión ${snapshot.revision}. No se envió a ningún servidor de votación.`,
    )
    render()
  } catch (error) {
    feedback(
      messages[error.code] ?? 'No se pudo validar este cambio de prueba.',
      true,
    )
  }
}

el('vote').addEventListener('click', () =>
  submit({kind: 'vote', proposal: el('proposal').value, signal}),
)
el('withdraw').addEventListener('click', () =>
  submit({kind: 'withdraw', proposal: el('proposal').value}),
)
el('grant').addEventListener('click', () => {
  const mode = el('scope').value
  const proposal = demoElection.proposals.find(
    p => p.id === el('proposal').value,
  )
  const scope =
    mode === 'proposal'
      ? {mode, proposal: proposal.id}
      : mode === 'topic'
        ? {mode, topic: proposal.topic}
        : {mode}
  submit({
    kind: 'delegate',
    delegate: el('delegate').value,
    scope,
    expiresAt: demoElection.closesAt,
  })
})
el('close').addEventListener('click', () => {
  time = demoElection.closesAt
  snapshot = evaluateElection(demoElection, events, time)
  feedback(
    'Cierre simulado. El resultado queda fijo; una delegación vigente hasta el cierre conserva su efecto.',
  )
  render()
})
el('reset').addEventListener('click', () => {
  events = structuredClone(demoEvents)
  time = 10000
  signal = 2
  snapshot = evaluateElection(demoElection, events, time)
  feedback(
    'Demo reiniciada. Ana → Bruno → Carla; Carla votó +2 en parque y +1 en biblioteca.',
  )
  render()
})
el('actor').addEventListener('change', render)
el('proposal').addEventListener('change', render)

function textNode(tag, text, className) {
  const node = document.createElement(tag)
  node.textContent = text
  if (className) node.className = className
  return node
}
function resultCard(result) {
  const card = document.createElement('div')
  card.className = 'result'
  card.append(
    textNode(
      'h3',
      demoElection.proposals.find(p => p.id === result.proposal).label,
    ),
  )
  const metrics = document.createElement('div')
  metrics.className = 'metrics'
  for (const [value, label] of [
    [`${result.represented}/${result.eligible}`, 'Personas representadas'],
    [result.flatSignalSum, 'Señal plana'],
    [result.intensitySignalSum, 'Señal con intensidad'],
  ]) {
    const metric = document.createElement('div')
    metric.className = 'metric'
    metric.append(textNode('strong', String(value)), textNode('span', label))
    metrics.append(metric)
  }
  card.append(
    metrics,
    textNode(
      'p',
      `${result.direct} directos · ${result.delegated} delegados · ${result.unresolved} sin ejercer · ${result.creditsSpent} créditos. Quórum ${result.quorumMet ? 'cumplido' : 'pendiente'}: ${result.quorumTarget} de ${result.eligible}.`,
    ),
  )
  return card
}

function render() {
  const actor = el('actor').value
  const proposal = el('proposal').value
  const closed = snapshot.phase === 'closed'
  const own = snapshot.resolutions.find(
    r => r.participant === actor && r.proposal === proposal,
  )
  const budget = snapshot.budgets.find(b => b.participant === actor)
  el('budget-total').textContent = String(demoElection.creditsPerParticipant)
  el('remaining').textContent = String(budget.remaining)
  el('current').textContent = own.source
    ? `${own.status === 'direct' ? 'Tu voto directo' : `Sigues a ${name(own.source)} · ${own.depth} ${own.depth === 1 ? 'paso' : 'pasos'}`}: ${own.signal > 0 ? '+' : ''}${own.signal}. Costo en esta propuesta: ${own.cost}.`
    : `Tu voz aún no se ejerce en esta propuesta${own.status === 'cycle' ? ': la cadena tiene un ciclo' : own.status === 'depth-limit' ? ': se alcanzó el límite de pasos' : ''}.`
  const projected = budget.remaining + own.cost - quadraticCost(signal)
  el('preview').textContent =
    `Este voto cuesta ${quadraticCost(signal)} créditos y sustituye el gasto actual de ${own.cost}. ${projected < 0 ? `Te faltan ${-projected} créditos para este cambio.` : `Saldo personal previsto: ${projected}.`} El motor también verifica a quienes te siguen.`
  const selectedDelegate = el('delegate').value
  el('delegate').replaceChildren(
    ...demoElection.participants
      .filter(id => id !== actor)
      .map(id => option(id, name(id))),
  )
  if (
    selectedDelegate !== actor &&
    demoElection.participants.includes(selectedDelegate)
  )
    el('delegate').value = selectedDelegate
  for (const button of el('signals').children) {
    button.setAttribute(
      'aria-pressed',
      String(Number(button.dataset.signal) === signal),
    )
    button.disabled = closed
  }
  for (const id of ['vote', 'withdraw', 'grant', 'close', 'delegate', 'scope'])
    el(id).disabled = closed
  el('withdraw').disabled = closed || own.status !== 'direct'
  el('phase').textContent = closed ? 'Elección cerrada' : 'Elección abierta'
  el('revision').textContent = `· revisión ${snapshot.revision}`
  el('contract').textContent = `${snapshot.election} / ${snapshot.rulesVersion}`
  const revoked = new Set(
    events.filter(e => e.kind === 'revoke').map(e => e.delegation),
  )
  const grants = events.filter(
    e => e.kind === 'delegate' && e.actor === actor && !revoked.has(e.id),
  )
  el('grants').replaceChildren(
    ...grants.map(grant => {
      const row = document.createElement('div')
      row.className = 'grant'
      row.append(
        textNode(
          'span',
          `${name(grant.delegate)} · ${grant.scope.mode === 'community' ? 'Comunidad' : grant.scope.mode === 'topic' ? 'Tema: presupuesto' : demoElection.proposals.find(p => p.id === grant.scope.proposal).label}`,
        ),
      )
      const button = textNode('button', 'Retirar', 'text-button')
      button.disabled = closed
      button.setAttribute(
        'aria-label',
        `Retirar delegación a ${name(grant.delegate)} en ${grant.scope.mode}`,
      )
      button.addEventListener('click', () =>
        submit({kind: 'revoke', delegation: grant.id}),
      )
      row.append(button)
      return row
    }),
  )
  el('results').replaceChildren(...snapshot.results.map(resultCard))
  el('publication').replaceChildren(
    ...(snapshot.publication.state === 'synthetic-final'
      ? snapshot.publication.results.map(resultCard)
      : [
          textNode(
            'p',
            snapshot.publication.reason === 'not-closed'
              ? 'Resultados retenidos hasta el cierre. Durante la votación no se comparten cambios individuales.'
              : `Resultados retenidos: alguna propuesta no alcanza las ${demoElection.publicationMinimum} personas representadas del mínimo de esta demo.`,
            'publication-message',
          ),
        ]),
  )
}
render()
