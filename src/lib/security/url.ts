export function isRestrictedPageUrl(url: string): boolean {
  return !/^https?:\/\//i.test(url);
}
