export function userPresenceChannel(userId: number): string {
  return `user:${userId}:presence`;
}
