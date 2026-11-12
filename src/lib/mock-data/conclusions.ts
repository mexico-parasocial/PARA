import {type AtUriString} from '@atproto/syntax'

import {
  type ConclusionOfCabildeo,
  type ConclusionView,
} from '#/lib/api/conclusion'

/*
 * Development-only conclusion for the demo forum "Sombra y árboles en el
 * Centro Histórico" (see ./cabildeos.ts). The demo seed writes no forum
 * cabildeos, so this is the only way to see the section without an
 * integration fixture. Served only while USE_MOCK_DATA is on.
 */

const CABILDEO = 'at://did:plc:alice/com.para.civic.cabildeo/sombra-centro'
const COMMUNITY = 'at://did:plc:alice/com.para.community.board/medio-ambiente'
const STEWARD = 'did:plc:alice'

type DatetimeString = ConclusionView['createdAt']

const day = (offset: number) =>
  new Date(Date.now() + offset * 864e5).toISOString() as DatetimeString

const uri = (rkey: string) =>
  `at://${STEWARD}/com.para.civic.conclusion/${rkey}` as AtUriString

export const MOCK_CONCLUSION_BY_CABILDEO: Record<string, ConclusionOfCabildeo> =
  {
    [CABILDEO]: {
      communityUri: COMMUNITY,
      conclusion: {
        uri: uri('segunda'),
        cid: 'mock-conclusion-2',
        author: STEWARD,
        cabildeo: CABILDEO,
        communityUri: COMMUNITY,
        text: 'Hay acuerdo amplio en plantar árboles de sombra en las calles peatonales antes que instalar toldos. Quedan dos dudas abiertas: quién riega en los primeros dos años y cómo se protege el empedrado de las raíces.',
        cited: [
          {
            uri: 'at://did:plc:dan/com.para.civic.position/arboles',
            author: 'did:plc:dan',
            stance: 'for',
            text: 'Los árboles dan más sombra que cualquier toldo y bajan la temperatura de toda la calle, no solo de la banqueta.',
          },
          {
            uri: 'at://did:plc:eva/com.para.civic.position/raices',
            author: 'did:plc:eva',
            stance: 'amendment',
            text: 'De acuerdo, pero con especies de raíz profunda y un plan de riego con responsables por cuadra.',
          },
        ],
        edited: false,
        createdAt: day(-2),
      },
      earlier: [
        {
          uri: uri('primera'),
          cid: 'mock-conclusion-1',
          author: STEWARD,
          cabildeo: CABILDEO,
          communityUri: COMMUNITY,
          text: 'Primera lectura: la conversación se inclina por árboles, pero falta escuchar a los comercios de la zona.',
          cited: [],
          edited: false,
          createdAt: day(-7),
        },
      ],
    },
  }
