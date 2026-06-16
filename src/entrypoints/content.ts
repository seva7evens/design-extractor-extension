import { defineContentScript } from '#imports';
import { extractPageEvidenceInPage } from '@/lib/extraction/in-page';

declare global {
  var __DESIGN_MD_EXTRACT_PAGE: typeof extractPageEvidenceInPage | undefined;
}

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  registration: 'runtime',
  main() {
    globalThis.__DESIGN_MD_EXTRACT_PAGE = extractPageEvidenceInPage;
  }
});
