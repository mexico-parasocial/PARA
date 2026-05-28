import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {type OfficialActionType} from '#/lib/api/para-lexicons'
import {type RepresentativeItem} from '#/lib/mock-data'
import {
  createOfficialAction,
  getOfficialActionsForSubject,
  getOfficialCabildeoSignatures,
  getOfficialCivicAccountForRepresentative,
  getOfficialControllerForViewer,
  getOfficialControllers,
  getViewerOfficialControllerAccounts,
  type OfficialCivicAccount,
  signOfficialCabildeo,
} from '#/lib/official-civic-accounts'

const officialRoot = 'official-civic-accounts'

export function useOfficialCivicAccountQuery(
  representative: RepresentativeItem | undefined,
  viewerDid?: string,
) {
  return useQuery({
    queryKey: [officialRoot, 'representative', representative?.id, viewerDid],
    queryFn: async () => {
      if (!representative) return null
      const account = getOfficialCivicAccountForRepresentative(representative)
      return {
        account,
        controllers: getOfficialControllers(account.id),
        viewerController: getOfficialControllerForViewer(account.id, viewerDid),
      }
    },
    enabled: Boolean(representative),
    staleTime: 1000 * 15,
  })
}

export function useViewerOfficialAccountsQuery(
  representatives: RepresentativeItem[],
  viewerDid?: string,
) {
  return useQuery({
    queryKey: [
      officialRoot,
      'viewer-accounts',
      viewerDid,
      representatives.map(rep => rep.id).join(','),
    ],
    queryFn: async () =>
      getViewerOfficialControllerAccounts(representatives, viewerDid),
    enabled: Boolean(viewerDid),
    staleTime: 1000 * 15,
  })
}

export function useOfficialActionsForSubjectQuery(subjectUri?: string) {
  return useQuery({
    queryKey: [officialRoot, 'actions', subjectUri],
    queryFn: async () => {
      if (!subjectUri) return []
      return getOfficialActionsForSubject(subjectUri)
    },
    enabled: Boolean(subjectUri),
    staleTime: 1000 * 15,
  })
}

export function useOfficialCabildeoSignaturesQuery(cabildeoUri?: string) {
  return useQuery({
    queryKey: [officialRoot, 'cabildeo-signatures', cabildeoUri],
    queryFn: async () => {
      if (!cabildeoUri) return []
      return getOfficialCabildeoSignatures(cabildeoUri)
    },
    enabled: Boolean(cabildeoUri),
    staleTime: 1000 * 15,
  })
}

export function useCreateOfficialActionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      entityId: string
      controllerDid: string
      actionType: OfficialActionType
      subjectUri: string
      summary: string
      entityName?: string
      recordUri?: string
    }) => createOfficialAction(input),
    onSuccess: action => {
      void queryClient.invalidateQueries({queryKey: [officialRoot]})
      void queryClient.invalidateQueries({
        queryKey: [officialRoot, 'actions', action.subjectUri],
      })
    },
  })
}

export function useSignOfficialCabildeoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      account: OfficialCivicAccount
      controllerDid: string
      cabildeoUri: string
      summary: string
    }) => signOfficialCabildeo(input),
    onSuccess: action => {
      void queryClient.invalidateQueries({queryKey: [officialRoot]})
      void queryClient.invalidateQueries({
        queryKey: [officialRoot, 'cabildeo-signatures', action.subjectUri],
      })
    },
  })
}
