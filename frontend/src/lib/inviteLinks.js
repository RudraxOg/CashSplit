const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isLocalInviteLink(link) {
  try { return LOCAL_HOSTS.has(new URL(link).hostname); } catch { return false; }
}

export function shareableInviteUrl(invite, browserOrigin) {
  const serverUrl = invite?.inviteUrl ? new URL(invite.inviteUrl) : null;
  const path = invite?.invitePath || (serverUrl ? `${serverUrl.pathname}${serverUrl.search}` : '');
  if (!path.startsWith('/join/')) return '';
  const origin = serverUrl && !isLocalInviteLink(serverUrl.href) ? serverUrl.origin : browserOrigin;
  return new URL(path, origin).toString();
}
