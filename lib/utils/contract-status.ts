/**
 * Contract Status Management Utilities
 * 
 * Centralized definition of contract statuses, labels, and valid transitions.
 * This ensures consistency across client and server-side code.
 */

export type ContractStatus = 
  | 'draft' 
  | 'in_review' 
  | 'pending_approval' 
  | 'approved' 
  | 'pending_signature' 
  | 'executed' 
  | 'expired' 
  | 'terminated';

/**
 * Turkish labels for contract statuses
 */
export const statusLabels: Record<ContractStatus, string> = {
  draft: 'Taslak',
  in_review: 'İncelemede',
  pending_approval: 'Onay Bekliyor',
  approved: 'Onaylandı',
  pending_signature: 'İmza Bekliyor',
  executed: 'Yürürlükte',
  expired: 'Süresi Doldu',
  terminated: 'İptal Edildi',
};

/**
 * Valid status transitions
 * 
 * Defines which status transitions are allowed from each current status.
 * This enforces a workflow where contracts must follow a logical progression.
 * 
 * Workflow:
 * 1. draft → in_review or pending_approval
 * 2. in_review → pending_approval or back to draft
 * 3. pending_approval → approved (or back to in_review/draft)
 * 4. approved → pending_signature or executed
 * 5. pending_signature → executed or back to approved
 * 6. executed → expired or terminated
 * 7. expired → terminated
 * 8. terminated → (terminal state, no transitions)
 */
export const validTransitions: Record<ContractStatus, ContractStatus[]> = {
  draft: ['in_review', 'pending_approval'],
  in_review: ['pending_approval', 'draft'],
  pending_approval: ['approved', 'in_review', 'draft'],
  approved: ['pending_signature', 'executed'],
  pending_signature: ['executed', 'approved'],
  executed: ['expired', 'terminated'],
  expired: ['terminated'],
  terminated: [], // Terminal state - no transitions allowed
};

/**
 * Get human-readable label for a status
 */
export function getStatusLabel(status: ContractStatus | string): string {
  return statusLabels[status as ContractStatus] || status;
}

/**
 * Check if a status transition is valid
 * 
 * @param fromStatus - Current status
 * @param toStatus - Desired new status
 * @returns true if transition is valid, false otherwise
 */
export function isValidTransition(
  fromStatus: ContractStatus | string,
  toStatus: ContractStatus | string
): boolean {
  const transitions = validTransitions[fromStatus as ContractStatus];
  if (!transitions) return false;
  return transitions.includes(toStatus as ContractStatus);
}

/**
 * Get all valid next statuses for a given current status
 * 
 * @param currentStatus - Current contract status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(
  currentStatus: ContractStatus | string
): ContractStatus[] {
  return validTransitions[currentStatus as ContractStatus] || [];
}

/**
 * Get status descriptions for UI tooltips/help text
 */
export const statusDescriptions: Record<ContractStatus, string> = {
  draft: 'Sözleşme taslak halinde. Henüz gözden geçirilmemiş.',
  in_review: 'Sözleşme inceleme aşamasında.',
  pending_approval: 'Sözleşme onay bekliyor.',
  approved: 'Sözleşme onaylandı. İmza aşamasına geçilebilir.',
  pending_signature: 'Sözleşme imza bekliyor.',
  executed: 'Sözleşme yürürlükte.',
  expired: 'Sözleşme süresi doldu.',
  terminated: 'Sözleşme iptal edildi.',
};

/**
 * Get description for a status
 */
export function getStatusDescription(status: ContractStatus | string): string {
  return statusDescriptions[status as ContractStatus] || '';
}

