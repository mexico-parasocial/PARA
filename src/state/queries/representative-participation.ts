import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {type RepresentativeItem} from '#/lib/mock-data'
import {
  checkRepresentativeAreaEligibility,
  createOfficialPajareoResponse,
  createRepresentativeNomination,
  createRepresentativePajareoEntry,
  getRepresentativeNominations,
  getRepresentativePajareoEntries,
  getRepresentativeParticipationIndex,
  reportRepresentativePajareoEntry,
  type RepresentativeNominationMode,
  type RepresentativePajareoEntryType,
  supportRepresentativePajareoEntry,
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
      return {
        entries: getRepresentativePajareoEntries(representative.id),
        eligibility: checkRepresentativeAreaEligibility({
          representative,
          viewerDid,
        }),
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
    }) => createRepresentativePajareoEntry(input),
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
    mutationFn: async (entryId: string) =>
      supportRepresentativePajareoEntry(entryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: [participationRoot]})
    },
  })
}

export function useReportRepresentativePajareoEntryMutation() {
  return useMutation({
    mutationFn: async (entryId: string) =>
      reportRepresentativePajareoEntry(entryId),
  })
}

export function useCreateOfficialPajareoResponseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      representativeId: string
      entryId: string
      entityId: string
      entityName: string
      controllerDid: string
      body: string
    }) => createOfficialPajareoResponse(input),
    onSuccess: response => {
      void queryClient.invalidateQueries({queryKey: [participationRoot]})
      void queryClient.invalidateQueries({
        queryKey: [participationRoot, 'pajareo', response.representativeId],
      })
    },
  })
}
