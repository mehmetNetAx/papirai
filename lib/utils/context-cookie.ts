/**
 * Cookie utility functions for managing selected company and workspace context
 */

const COOKIE_NAMES = {
  COMPANY: 'papirai_selected_company',
  WORKSPACE: 'papirai_selected_workspace',
} as const;

const COOKIE_EXPIRE_DAYS = 30;

/**
 * Set a cookie with the given name, value, and expiration
 */
function setCookie(name: string, value: string, days: number = COOKIE_EXPIRE_DAYS) {
  if (typeof document === 'undefined') {
    return; // Server-side, skip
  }

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null; // Server-side, return null
  }

  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * Delete a cookie by name
 */
function deleteCookie(name: string) {
  if (typeof document === 'undefined') {
    return; // Server-side, skip
  }

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/**
 * Get selected company ID from cookie
 */
export function getSelectedCompanyId(): string | null {
  return getCookie(COOKIE_NAMES.COMPANY);
}

/**
 * Set selected company ID in cookie
 */
export function setSelectedCompanyId(companyId: string) {
  setCookie(COOKIE_NAMES.COMPANY, companyId);
}

/**
 * Get selected workspace ID from cookie
 */
export function getSelectedWorkspaceId(): string | null {
  return getCookie(COOKIE_NAMES.WORKSPACE);
}

/**
 * Set selected workspace ID in cookie
 */
export function setSelectedWorkspaceId(workspaceId: string) {
  setCookie(COOKIE_NAMES.WORKSPACE, workspaceId);
}

/**
 * Clear both company and workspace cookies
 */
export function clearContextCookies() {
  deleteCookie(COOKIE_NAMES.COMPANY);
  deleteCookie(COOKIE_NAMES.WORKSPACE);
}

/**
 * Server-side: Get selected company ID from request cookies
 */
export function getSelectedCompanyIdFromRequest(cookies: string | undefined): string | null {
  if (!cookies) return null;
  
  const match = cookies.match(new RegExp(`(^| )${COOKIE_NAMES.COMPANY}=([^;]+)`));
  return match ? match[2] : null;
}

/**
 * Server-side: Get selected workspace ID from request cookies
 */
export function getSelectedWorkspaceIdFromRequest(cookies: string | undefined): string | null {
  if (!cookies) return null;
  
  const match = cookies.match(new RegExp(`(^| )${COOKIE_NAMES.WORKSPACE}=([^;]+)`));
  return match ? match[2] : null;
}

