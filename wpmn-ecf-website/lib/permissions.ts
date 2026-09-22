// Shared site content is editable by the ministry's named editors. Private
// intake and payment destinations require pastoral-owner authority.
export type EditorRole = 'pastoral-owner' | 'editor';
export type Permission = 'content' | 'pastoral' | 'giving';
export function isEditorRole(role: unknown): role is EditorRole {
  return role === 'pastoral-owner' || role === 'editor';
}
export function permits(role: unknown, permission: Permission): boolean {
  return isEditorRole(role) && (permission === 'content' || role === 'pastoral-owner');
}
export function sensitiveSetting(key: string): boolean {
  return ['give.paymentUrl', 'give.bankName', 'give.accountName', 'give.accountNumber'].includes(key);
}
