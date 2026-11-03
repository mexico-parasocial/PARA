import {
  type FollowThroughOfCabildeo,
  type FollowThroughSummaryView,
  type FollowThroughUpdateView,
  type FollowThroughView,
} from '#/lib/api/follow-through'

/*
 * Development-only seguimiento for the demo cabildeo "Salario Mínimo Digno
 * 2026" (see ./cabildeos.ts), which resolved with a winner. The demo seed
 * cannot produce a resolved cabildeo with a winning option, so this is the
 * only way to see the section without an integration fixture.
 */

const CABILDEO = 'at://did:plc:eva/com.para.civic.cabildeo/salario-minimo'
const COMMUNITY = 'at://did:plc:eva/com.para.community.board/derechos-laborales'
const STEWARD = 'did:plc:eva'

type DatetimeString = FollowThroughView['createdAt']

const day = (offset: number) =>
  new Date(Date.now() + offset * 864e5).toISOString() as DatetimeString

function update(
  slug: string,
  occurredIn: number,
  fields: Partial<FollowThroughUpdateView> & {status: string},
): FollowThroughUpdateView {
  return {
    uri: `at://${STEWARD}/com.para.civic.followThroughUpdate/${slug}`,
    author: STEWARD,
    evidenceUris: [],
    edited: false,
    occurredAt: day(occurredIn),
    createdAt: day(occurredIn),
    ...fields,
  }
}

function item(
  slug: string,
  fields: Partial<FollowThroughView> &
    Pick<FollowThroughView, 'title' | 'status' | 'overdue'>,
): FollowThroughView {
  return {
    uri: `at://${STEWARD}/com.para.civic.followThrough/${slug}`,
    cid: `bafymock${slug}`,
    author: STEWARD,
    cabildeo: CABILDEO,
    communityUri: COMMUNITY,
    optionIndex: 0,
    rescheduledCount: 0,
    edited: false,
    createdAt: day(-14),
    ...fields,
  }
}

const presented = item('iniciativa', {
  title: 'Presentar la iniciativa ante el Congreso de Yucatán',
  summary: 'Registro formal de la iniciativa con las firmas del cabildeo.',
  responsibleLabel: 'Comisión de Derechos Laborales',
  dueAt: day(-10),
  currentDueAt: day(-10),
  status: 'completed',
  progress: 100,
  overdue: false,
  lastUpdateAt: day(-6),
  updates: [
    update('iniciativa-1', -12, {
      status: 'in_progress',
      progress: 50,
      note: 'Redacción final con asesoría jurídica.',
    }),
    update('iniciativa-2', -6, {
      status: 'completed',
      progress: 100,
      note: 'Iniciativa registrada con folio 0412.',
      evidenceUris: ['https://congresoyucatan.example/folio/0412'],
    }),
  ],
})

const convocar = item('convocar', {
  title: 'Convocar a tres cámaras empresariales',
  responsibleLabel: 'Enlace de la comunidad',
  parent: `at://${STEWARD}/com.para.civic.followThrough/mesa`,
  dueAt: day(-9),
  currentDueAt: day(-9),
  status: 'completed',
  progress: 100,
  overdue: false,
  lastUpdateAt: day(-8),
})

const minuta = item('minuta', {
  title: 'Publicar la minuta de la mesa de trabajo',
  parent: `at://${STEWARD}/com.para.civic.followThrough/mesa`,
  dueAt: day(-4),
  currentDueAt: day(-4),
  status: 'in_progress',
  progress: 30,
  overdue: true,
  lastUpdateAt: day(-5),
})

const mesa = item('mesa', {
  title: 'Mesa de trabajo con cámaras empresariales',
  summary: 'Tres sesiones para acordar el calendario de aplicación.',
  responsibleLabel: 'Comisión de Derechos Laborales',
  dueAt: day(-12),
  currentDueAt: day(-3),
  rescheduledCount: 1,
  status: 'in_progress',
  progress: 65,
  overdue: true,
  lastUpdateAt: day(-5),
  edited: true,
  withdrawnUpdates: 1,
  children: [convocar, minuta],
  updates: [
    update('mesa-1', -9, {
      status: 'in_progress',
      progress: 40,
      note: 'Primera sesión realizada con dos de tres cámaras.',
    }),
    update('mesa-2', -5, {
      status: 'in_progress',
      dueAt: day(-3),
      note: 'La tercera cámara pidió otra fecha. Nuevo plazo.',
    }),
  ],
})

const informe = item('informe', {
  title: 'Informe público de resultados',
  dueAt: day(20),
  currentDueAt: day(20),
  status: 'planned',
  overdue: false,
})

export const MOCK_FOLLOW_THROUGH_BY_CABILDEO: Record<
  string,
  FollowThroughOfCabildeo
> = {
  [CABILDEO]: {
    items: [presented, mesa, informe],
    summary: {
      cabildeo: CABILDEO,
      total: 3,
      completed: 1,
      overdue: 1,
      abandoned: 0,
      progress: 55,
      nextDueAt: day(20),
      lastUpdateAt: day(-5),
    },
  },
}
