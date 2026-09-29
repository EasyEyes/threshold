// Token-scoped so disposal of an old view cannot unblock a newer one.
const blockers = new Set<object>();
export function blockInteractionInput() {
  const token = {};
  blockers.add(token);
  return () => {
    blockers.delete(token);
  };
}
export const interactionInputIsBlocked = () => blockers.size > 0;
