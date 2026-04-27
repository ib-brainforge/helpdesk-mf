import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { SlaIndicatorDto } from '@/types';
import { SlaStatus } from '@/types';
import { SlaApi } from '@brainforgeau/helpdesk-client';
import type { HelpdeskApplicationSlaDTOsTicketSlaStatusDto } from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Map the backend TicketSlaStatusDto to the UI SlaIndicatorDto.
 *
 * The backend currently exposes a single SLA timer (elapsedSeconds +
 * deadlineUtc + isBreached + isPaused) rather than separate response-
 * time / resolution-time fields.  We map the single timer to the
 * resolutionTime slot used by SlaIndicator, leaving responseTime
 * undefined so the indicator renders only what is available.
 */
function mapSlaStatus(
  ticketId: string,
  dto: HelpdeskApplicationSlaDTOsTicketSlaStatusDto,
): SlaIndicatorDto {
  // Derive remaining minutes from deadlineUtc when present
  let resolutionTimeRemaining: number | undefined;
  if (dto.deadlineUtc) {
    const deadlineMs = new Date(dto.deadlineUtc).getTime();
    const nowMs = Date.now();
    resolutionTimeRemaining = Math.round((deadlineMs - nowMs) / 60_000);
  }

  // Derive status from isBreached flag and timer state
  let resolutionStatus: SlaStatus | undefined;
  if (dto.slaPolicyId) {
    if (dto.isBreached) {
      resolutionStatus = SlaStatus.Breached;
    } else if (
      resolutionTimeRemaining !== undefined &&
      resolutionTimeRemaining < 30
    ) {
      resolutionStatus = SlaStatus.Warning;
    } else {
      resolutionStatus = SlaStatus.OnTrack;
    }
  }

  return {
    ticketId,
    resolutionTimeDeadline: dto.deadlineUtc ?? undefined,
    resolutionTimeRemaining,
    resolutionStatus,
  };
}

export const useSla = (ticketId: string) => {
  const { data, isLoading, refetch } = useQuery<SlaIndicatorDto | undefined>({
    queryKey: ['sla', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(SlaApi);
      const response = await client.v1SlaTicketTicketIdGet(ticketId);
      const dto = response.data;
      // If no policy is attached the backend returns a bare object; treat as no SLA
      if (!dto || !dto.slaPolicyId) return undefined;
      return mapSlaStatus(ticketId, dto);
    },
    enabled: Boolean(ticketId),
  });

  return {
    slaData: data,
    isLoading,
    refetch,
  };
};

export const useStartSlaTimer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(SlaApi);
      const response = await client.v1SlaTicketTicketIdTimerStartPost(ticketId);
      return response.data;
    },
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['sla', ticketId] });
    },
  });
};

export const useStopSlaTimer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(SlaApi);
      const response = await client.v1SlaTicketTicketIdTimerStopPost(ticketId);
      return response.data;
    },
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['sla', ticketId] });
    },
  });
};

export const usePauseSlaTimer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const client = await createHelpdeskApiClient(SlaApi);
      const response = await client.v1SlaTicketTicketIdTimerPausePost(ticketId);
      return response.data;
    },
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['sla', ticketId] });
    },
  });
};

export const useSlaPolicies = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sla-policies'],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(SlaApi);
      const response = await client.v1SlaGet();
      return response.data ?? [];
    },
  });

  return {
    policies: data ?? [],
    isLoading,
    refetch,
  };
};
