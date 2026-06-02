import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  getPajareoRepresentative,
  getPajareoRepresentativeMe,
  postPajareoEntry,
  postPajareoReport,
  postPajareoResponse,
  postPajareoSupport,
} from '#/lib/m8/api'
import {type RepresentativeItem} from '#/lib/mock-data'
import {
  createRepresentativeNomination,
  getRepresentativeNominations,
  getRepresentativeParticipationIndex,
  type RepresentativeNominationMode,
  type RepresentativePajareoEntryType,
  updateRepresentativeNominationStatus,
} from '#/lib/representatives/participation'

const participationRoot = 'representative-participation'

export function useRepresentativeParticipationIndexQuery() {
  return useQuery({
    queryKey: [participationRoot, 'index'],
    queryFn: async () => getRepresentativeParticipationIndex(),
    staleTime: 1000 * 15,
  })
}

export function useRepresentativeNominationsQuery(
  representativeId: string | undefined,
  viewerDid?: string,
) {
  return useQuery({
    queryKey: [participationRoot, 'nominations', representativeId, viewerDid],
    queryFn: async () => {
      if (!representativeId) return []
      return getRepresentativeNominations(representativeId, viewerDid)
    },
    enabled: Boolean(representativeId),
    staleTime: 1000 * 15,
  })
}

export function useRepresentativePajareoQuery({
  representative,
  viewerDid,
}: {
  representative: RepresentativeItem | undefined
  viewerDid?: string
}) {
  return useQuery({
    queryKey: [participationRoot, 'pajareo', representative?.id, viewerDid],
    queryFn: async () => {
      if (!representative) {
        return {entries: [], eligibility: null}
      }
      if (!viewerDid) {
        const feed = await getPajareoRepresentative(representative.id)
        return {entries: feed.entries, eligibility: null}
      }

      try {
        const feed = await getPajareoRepresentativeMe(representative.id)
        return {
          entries: feed.entries,
          eligibility: feed.eligibility ?? null,
          pajareoIdentity: feed.pajareoIdentity,
        }
      } catch {
        const feed = await getPajareoRepresentative(representative.id)
        return {entries: feed.entries, eligibility: null}
      }
    },
    enabled: Boolean(representative),
    staleTime: 1000 * 15,
  })
}

export function useCreateRepresentativeNominationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      representativeId: string
      mode: RepresentativeNominationMode
      nominatorDid: string
      nomineeHandle?: string
      nomineeDid?: string
      communityUri?: string
      reason: string
    }) => createRepresentativeNomination(input),
    onSuccess: nomination => {
      void queryClient.invalidateQueries({queryKey: [participationRoot]})
      void queryClient.invalidateQueries({
        queryKey: [participationRoot, 'nominations', nomination.representativeId],
      })
    },
  })
}

export function useUpdateRepresentativeNominationStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      nominationId: string
      status: 'accepted' | 'declined' | 'expired'
    }) =>
      updateRepresentativeNominationStatus(
        input.nominationId,
        input.status,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: [participationRoot]})
    },
  })
}

export function useCreateRepresentativePajareoEntryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      representativeId: string
      viewerDid: string
      type: RepresentativePajareoEntryType
      body: string
    }) => postPajareoEntry(input.representativeId, {
      type: input.type,
      body: input.body,
    }).then(result => result.entry),
    onSuccess: entry => {
      void queryClient.invalidateQueries({queryKey: [participationRoot]})
      void queryClient.invalidateQueries({
        queryKey: [participationRoot, 'pajareo', entry.representativeId],
      })
    },
  })
}

export function useSupportRepresentativePajareoEntryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entryId: string) => postPajareoSupport(entryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: [participationRoot]})
    },
  })
}

export function useReportRepresentativePajareoEntryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entryId: string) => postPajareoReport(entryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: [participationRoot]})
    },
  })
}

export function useCreateOfficialPajareoResponseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      representativeId: string
      entryId: string
      entityId?: string
      entityName?: string
      controllerDid?: string
      body: string
    }) => postPajareoResponse(input.entryId, {body: input.body}).then(result => result.response),
    onSuccess: response => {
      void queryClient.invalidateQueries({queryKey: [participationRoot]})
      void queryClient.invalidateQueries({
        queryKey: [participationRoot, 'pajareo', response.representativeId],
      })
    },
  })
}
