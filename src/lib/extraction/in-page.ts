import type { ExtractionEvidence, ExtractionOptions } from './types';

export async function extractPageEvidenceInPage(options?: Partial<ExtractionOptions>): Promise<ExtractionEvidence> {
  const opts = {
    captureMode: options?.captureMode ?? 'fullPage',
    includeRawCssVariables: options?.includeRawCssVariables ?? false,
    maxNodes: options?.maxNodes ?? 1000,
    maxTextLength: options?.maxTextLength ?? 240
  };

  const STYLE_PROPS = [
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'text-transform',
    'font-style',
    'font-variation-settings',
    'font-feature-settings',
    'text-align',
    'color',
    'background-color',
    'background-image',
    'border-color',
    'outline-color',
    'text-decoration-color',
    'opacity',
    'display',
    'position',
    'flex-direction',
    'align-items',
    'justify-content',
    'gap',
    'grid-template-columns',
    'grid-template-rows',
    'column-gap',
    'row-gap',
    'max-width',
    'width',
    'height',
    'padding',
    'margin',
    'top',
    'right',
    'bottom',
    'left',
    'border-radius',
    'border-width',
    'border-style',
    'overflow',
    'clip-path',
    'box-shadow',
    'text-shadow',
    'backdrop-filter',
    'filter',
    'transition-property',
    'transition-duration',
    'transition-timing-function',
    'animation-name',
    'animation-duration',
    'transform',
    'z-index',
    'visibility'
  ];
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'TEMPLATE']);
  const warnings: string[] = [];
  const all = Array.from(document.body?.querySelectorAll('*') ?? []);
  const nodeByElement = new WeakMap<Element, string>();
  const candidates: Array<{ element: Element; importance: number; rect: DOMRect; depth: number }> = [];

  for (const element of all) {
    if (SKIP_TAGS.has(element.tagName)) continue;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (!isVisible(element, style, rect)) continue;
    const text = sampleText(element.textContent ?? '', opts.maxTextLength);
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute('role') ?? inferredRole(element);
    const area = rect.width * rect.height;
    const importance = score({
      tag,
      role,
      area,
      y: rect.top + scrollY,
      textLength: text.length,
      interactive: isInteractive(element, role),
      headingLevel: headingLevel(tag),
      hasImage: tag === 'img' || Boolean(style.backgroundImage && style.backgroundImage !== 'none'),
      uniqueStyleCount: styleSignalCount(style)
    });
    if (importance >= 12 || isAlwaysKeep(tag, role, text)) {
      candidates.push({ element, importance, rect, depth: depthOf(element) });
    }
  }

  candidates.sort((a, b) => b.importance - a.importance);
  const kept = candidates.slice(0, opts.maxNodes).sort((a, b) => a.depth - b.depth || a.rect.top - b.rect.top);
  kept.forEach((item, index) => nodeByElement.set(item.element, `n${index + 1}`));

  const nodes = kept.map((item, index) => {
    const element = item.element as HTMLElement;
    const style = getComputedStyle(element);
    const id = `n${index + 1}`;
    const parentId = closestKeptParent(element, nodeByElement);
    const childIds = Array.from(element.children)
      .map((child) => nodeByElement.get(child))
      .filter(Boolean) as string[];
    const styles: Record<string, string> = {};
    for (const prop of STYLE_PROPS) {
      const value = style.getPropertyValue(prop);
      if (isUsefulStyle(prop, value)) styles[prop] = normalizeWhitespace(value);
    }
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute('role') ?? inferredRole(element);
    const text = sampleText(element.textContent ?? '', opts.maxTextLength);
    const asset = assetInfo(element, style);
    return {
      id,
      tag,
      role,
      accessibleName: accessibleName(element),
      text,
      selector: selectorHint(element),
      classSample: classSample(element),
      domId: stableDomId(element.id),
      rect: {
        x: round(item.rect.x),
        y: round(item.rect.y),
        width: round(item.rect.width),
        height: round(item.rect.height),
        documentX: round(item.rect.x + scrollX),
        documentY: round(item.rect.y + scrollY)
      },
      visibility: style.visibility,
      zIndex: style.zIndex,
      parentId,
      childIds,
      depth: item.depth,
      kind: semanticKind(element, role, text, asset, style),
      importance: item.importance,
      styles,
      asset
    };
  });

  const cssVariables = collectCssVariables(opts.includeRawCssVariables, warnings);
  const tokens = buildTokens(nodes, cssVariables);
  const componentInventory = buildComponentInventory(nodes);
  const layoutRegions = buildLayoutRegions(nodes);
  const stateHints = buildStateHints(nodes);

  return {
    metadata: {
      url: redactUrl(location.href),
      origin: location.origin,
      hostname: location.hostname,
      title: redactText(document.title),
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      documentWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0),
      documentHeight: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0),
      devicePixelRatio,
      language: document.documentElement.lang || navigator.language,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      themeColor: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content,
      frameworkHints: detectFrameworks()
    },
    nodes,
    tokens,
    componentInventory,
    layoutRegions,
    stateHints,
    warnings,
    capturedAt: new Date().toISOString()
  } as ExtractionEvidence;

  function isVisible(element: Element, style: CSSStyleDeclaration, rect: DOMRect): boolean {
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number.parseFloat(style.opacity || '1') <= 0.02) return false;
    if (rect.width < 2 || rect.height < 2) return false;
    if (element instanceof HTMLInputElement && (element.type === 'hidden' || element.type === 'password')) return false;
    if (rect.width <= 2 && rect.height <= 2) return false;
    return true;
  }

  function isAlwaysKeep(tag: string, role: string | undefined, text: string): boolean {
    return /^h[1-6]$/.test(tag) || ['header', 'nav', 'main', 'section', 'footer', 'form'].includes(tag) || role === 'button' || role === 'link' || text.length > 80;
  }

  function score(input: {
    tag: string;
    role?: string;
    area: number;
    y: number;
    textLength: number;
    interactive: boolean;
    headingLevel?: number;
    hasImage: boolean;
    uniqueStyleCount: number;
  }): number {
    let value = Math.min(40, Math.log10(Math.max(1, input.area)) * 10);
    if (input.y < 1200) value += 8;
    if (input.interactive) value += 14;
    if (input.hasImage) value += 10;
    if (input.textLength > 0) value += Math.min(12, input.textLength / 18);
    if (input.headingLevel) value += 18 - input.headingLevel * 2;
    if (['header', 'nav', 'main', 'section', 'footer', 'article', 'form'].includes(input.tag)) value += 12;
    if (['button', 'link', 'textbox'].includes(input.role ?? '')) value += 10;
    value += Math.min(8, input.uniqueStyleCount);
    return Math.round(value * 10) / 10;
  }

  function headingLevel(tag: string): number | undefined {
    return /^h[1-6]$/.test(tag) ? Number(tag[1]) : undefined;
  }

  function inferredRole(element: Element): string | undefined {
    const tag = element.tagName.toLowerCase();
    if (tag === 'a') return 'link';
    if (tag === 'button') return 'button';
    if (tag === 'input' || tag === 'textarea') return 'textbox';
    if (tag === 'nav') return 'navigation';
    if (tag === 'header') return 'banner';
    if (tag === 'footer') return 'contentinfo';
    if (tag === 'img') return 'img';
    return undefined;
  }

  function isInteractive(element: Element, role?: string): boolean {
    const tag = element.tagName.toLowerCase();
    return ['a', 'button', 'input', 'select', 'textarea', 'summary'].includes(tag) || ['button', 'link', 'tab', 'menuitem'].includes(role ?? '') || element.hasAttribute('onclick');
  }

  function styleSignalCount(style: CSSStyleDeclaration): number {
    return ['boxShadow', 'borderRadius', 'backgroundImage', 'transform', 'filter', 'backdropFilter'].filter((key) => {
      const value = (style as any)[key] as string;
      return value && value !== 'none' && value !== '0px';
    }).length;
  }

  function depthOf(element: Element): number {
    let depth = 0;
    let current: Element | null = element;
    while ((current = current.parentElement)) depth += 1;
    return depth;
  }

  function closestKeptParent(element: Element, map: WeakMap<Element, string>): string | undefined {
    let current = element.parentElement;
    while (current) {
      const id = map.get(current);
      if (id) return id;
      current = current.parentElement;
    }
    return undefined;
  }

  function sampleText(text: string, max: number): string {
    return redactText(normalizeWhitespace(text)).slice(0, max);
  }

  function normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  function selectorHint(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const id = stableDomId((element as HTMLElement).id);
    if (id) return `${tag}#${CSS.escape(id)}`;
    const classes = classSample(element)?.split(' ').slice(0, 2) ?? [];
    return classes.length ? `${tag}.${classes.map((item) => CSS.escape(item)).join('.')}` : tag;
  }

  function classSample(element: Element): string | undefined {
    const classes = Array.from(element.classList).filter((item) => item.length < 48 && !/[0-9a-f]{8,}/i.test(item));
    return classes.slice(0, 6).join(' ') || undefined;
  }

  function stableDomId(id: string | undefined): string | undefined {
    if (!id || id.length > 48 || /[0-9a-f]{8,}/i.test(id) || /\d{5,}/.test(id)) return undefined;
    return id;
  }

  function accessibleName(element: HTMLElement): string | undefined {
    const value = element.getAttribute('aria-label') || element.getAttribute('title') || (element instanceof HTMLImageElement ? element.alt : '');
    return value ? redactText(normalizeWhitespace(value)).slice(0, 160) : undefined;
  }

  function semanticKind(element: HTMLElement, role: string | undefined, text: string, asset: unknown, style: CSSStyleDeclaration): string {
    const tag = element.tagName.toLowerCase();
    const lower = `${tag} ${role ?? ''} ${element.className} ${element.id}`.toLowerCase();
    const textLower = text.toLowerCase();
    if (isSkeletonElement(element, style, text)) return 'skeleton';
    if (tag === 'header' || lower.includes('header')) return 'header';
    if (tag === 'nav' || role === 'navigation') return 'nav';
    if (tag === 'footer') return 'footer';
    if (/^h1$/.test(tag) || lower.includes('hero')) return 'hero';
    if (/newsletter|subscribe|signup/.test(lower + textLower)) return 'newsletter';
    if (/ranking|rankings|leaderboard|standing/.test(lower + textLower)) return 'ranking';
    if (/stat|score|metric|number/.test(lower + textLower)) return 'stat';
    if (/tournament|event|schedule|calendar/.test(lower + textLower)) return 'event-card';
    if (/sponsor|partner|logo-grid/.test(lower + textLower)) return 'partner-grid';
    if (/card|tile|panel|widget|module|profile/.test(lower)) return 'card';
    if (tag === 'section' || tag === 'article') return 'section';
    if (role === 'button' || tag === 'button') return 'button';
    if (role === 'link' || tag === 'a') return 'link';
    if (['input', 'textarea', 'select'].includes(tag)) return 'input';
    if (tag === 'form') return 'form';
    if (tag === 'img' || asset) return lower.includes('logo') || text.toLowerCase().includes('logo') ? 'logo' : 'image';
    if (lower.includes('card')) return 'card';
    if (text) return 'text';
    return 'unknown';
  }

  function isSkeletonElement(element: HTMLElement, style: CSSStyleDeclaration, text: string): boolean {
    const lower = `${element.className} ${element.id} ${style.animationName} ${style.backgroundImage}`.toLowerCase();
    if (/(skeleton|shimmer|placeholder|loading|pulse)/.test(lower)) return true;
    return !text && style.backgroundImage.includes('gradient') && style.animationName !== 'none';
  }

  function assetInfo(element: HTMLElement, style: CSSStyleDeclaration) {
    const tag = element.tagName.toLowerCase();
    if (tag === 'img' && element instanceof HTMLImageElement) {
      return {
        src: safePublicUrl(element.currentSrc || element.src),
        alt: redactText(element.alt || ''),
        width: element.naturalWidth || element.width,
        height: element.naturalHeight || element.height,
        logoCandidate: /logo/i.test(`${element.alt} ${element.className} ${element.id}`)
      };
    }
    const bg = style.backgroundImage;
    if (bg && bg !== 'none' && /url\(/.test(bg)) {
      return { backgroundImage: redactText(bg.slice(0, 500)) };
    }
    if (tag === 'svg') return { svg: true, logoCandidate: /logo/i.test(`${element.className} ${element.id}`) };
    return undefined;
  }

  function safePublicUrl(input: string): string | undefined {
    try {
      const url = new URL(input, location.href);
      if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'data:') return redactUrl(url.toString()).slice(0, 500);
    } catch {
      return undefined;
    }
    return undefined;
  }

  function isUsefulStyle(prop: string, value: string): boolean {
    const normalized = normalizeWhitespace(value);
    if (!normalized) return false;
    if (['none', 'normal', 'auto', '0px', 'rgba(0, 0, 0, 0)'].includes(normalized)) return false;
    if (prop === 'background-image' && !normalized.includes('gradient') && !normalized.includes('url(')) return false;
    return true;
  }

  function collectCssVariables(includeRaw: boolean, outWarnings: string[]): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const element of [document.documentElement, document.body, ...Array.from(document.querySelectorAll('main, header, footer, section')).slice(0, 20)]) {
      if (!element) continue;
      const style = getComputedStyle(element);
      for (let i = 0; i < style.length; i += 1) {
        const name = style[i];
        if (!name.startsWith('--')) continue;
        const value = normalizeWhitespace(style.getPropertyValue(name));
        if (!value) continue;
        if (includeRaw || /(color|space|gap|font|radius|shadow|z|motion|duration|ease|size|width|height)/i.test(name + value)) {
          vars[name] = redactText(value).slice(0, 180);
        }
      }
    }
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = Array.from(sheet.cssRules ?? []);
        for (const rule of rules.slice(0, 500)) {
          const text = rule.cssText;
          if (text.includes('--')) {
            for (const match of text.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)/g)) {
              if (includeRaw || /(color|space|gap|font|radius|shadow|z|motion|duration|ease|size|width|height)/i.test(match[1] + match[2])) {
                vars[match[1]] = redactText(normalizeWhitespace(match[2])).slice(0, 180);
              }
            }
          }
        }
      } catch {
        outWarnings.push('Skipped a restricted stylesheet due to CORS');
      }
    }
    return vars;
  }

  function buildTokens(nodes: any[], cssVariables: Record<string, string>) {
    const colorMap = new Map<string, { usageCount: number; area: number; backgroundArea: number; nodeIds: Set<string> }>();
    const typeMap = new Map<string, { count: number; nodeIds: Set<string>; data: any }>();
    const spacingMap = new Map<string, number>();
    const radiusMap = new Map<string, number>();
    const shadowMap = new Map<string, number>();
    const surfaceMap = new Map<string, { area: number; nodeIds: Set<string> }>();

    for (const node of nodes) {
      const area = node.rect.width * node.rect.height;
      for (const key of ['color', 'background-color', 'border-color', 'outline-color', 'text-decoration-color']) {
        const color = normalizeColor(node.styles[key]);
        if (color) {
          const existing = colorMap.get(color) ?? { usageCount: 0, area: 0, backgroundArea: 0, nodeIds: new Set<string>() };
          existing.usageCount += 1;
          existing.area += key === 'background-color' ? area : Math.min(area, 180);
          if (key === 'background-color') existing.backgroundArea += area;
          existing.nodeIds.add(node.id);
          colorMap.set(color, existing);
          if (key === 'background-color' && color.startsWith('#') && area > 2000) {
            const surface = surfaceMap.get(color) ?? { area: 0, nodeIds: new Set<string>() };
            surface.area += area;
            surface.nodeIds.add(node.id);
            surfaceMap.set(color, surface);
          }
        }
      }
      if (node.styles['background-image']?.includes('gradient(')) {
        const gradient = node.styles['background-image'].slice(0, 240);
        const existing = colorMap.get(gradient) ?? { usageCount: 0, area: 0, backgroundArea: 0, nodeIds: new Set<string>() };
        existing.usageCount += 1;
        existing.area += area;
        existing.backgroundArea += area;
        existing.nodeIds.add(node.id);
        colorMap.set(gradient, existing);
      }

      const typeKey = [
        node.styles['font-family'],
        node.styles['font-size'],
        node.styles['font-weight'],
        node.styles['line-height'],
        node.styles['letter-spacing']
      ].join('|');
      if (node.styles['font-size'] && node.text) {
        const existing = typeMap.get(typeKey) ?? {
          count: 0,
          nodeIds: new Set<string>(),
          data: {
            fontFamily: node.styles['font-family'] ?? 'system-ui',
            fontSize: node.styles['font-size'],
            fontWeight: node.styles['font-weight'] ?? '400',
            lineHeight: node.styles['line-height'] ?? 'normal',
            letterSpacing: node.styles['letter-spacing'] ?? '0px'
          }
        };
        existing.count += 1;
        existing.nodeIds.add(node.id);
        typeMap.set(typeKey, existing);
      }
      collectLengths(spacingMap, [node.styles.padding, node.styles.margin, node.styles.gap, node.styles['row-gap'], node.styles['column-gap']]);
      collectLengths(radiusMap, [node.styles['border-radius']]);
      if (node.styles['box-shadow']) shadowMap.set(node.styles['box-shadow'], (shadowMap.get(node.styles['box-shadow']) ?? 0) + 1);
    }

    const colors = Array.from(colorMap.entries())
      .filter(([, data]) => data.usageCount > 1 || data.area > 4000)
      .sort((a, b) => b[1].area - a[1].area || b[1].usageCount - a[1].usageCount)
      .slice(0, 36)
      .map(([value, data]) => ({
        value,
        role: classifyColor(value, data.usageCount, data.area, data.backgroundArea),
        usageCount: data.usageCount,
        area: Math.round(data.area),
        nodeIds: Array.from(data.nodeIds).slice(0, 12)
      }));

    const typography = Array.from(typeMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 24)
      .map((item) => ({
        role: classifyTypography(item.data.fontSize, item.data.fontWeight),
        ...item.data,
        count: item.count,
        nodeIds: Array.from(item.nodeIds).slice(0, 12)
      }));

    return {
      colors,
      typography,
      spacing: roleLengths(spacingMap, ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'section']),
      radius: roleLengths(radiusMap, ['none', 'xs', 'sm', 'md', 'lg', 'xl', 'pill', 'full']),
      shadows: Array.from(shadowMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([value, count], index) => ({ role: index === 0 ? 'soft' : 'elevated', value, count })),
      surfaces: Array.from(surfaceMap.entries())
        .sort((a, b) => b[1].area - a[1].area)
        .slice(0, 12)
        .map(([value, data]) => ({ value, area: Math.round(data.area), nodeIds: Array.from(data.nodeIds).slice(0, 12) })),
      cssVariables
    };
  }

  function buildComponentInventory(nodes: any[]) {
    const componentKinds = new Set([
      'button',
      'input',
      'form',
      'nav',
      'header',
      'footer',
      'hero',
      'section',
      'card',
      'newsletter',
      'ranking',
      'stat',
      'event-card',
      'partner-grid',
      'skeleton',
      'image',
      'logo'
    ]);
    type ComponentGroup = { name: string; kind: string; count: number; nodeIds: string[]; textSamples: string[]; rectSamples: any[]; styles: Record<string, string> };
    const groups = new Map<string, ComponentGroup>();
    for (const node of nodes) {
      if (!componentKinds.has(node.kind)) continue;
      const name = componentName(node);
      const styles = styleSummary(node.styles);
      const key = `${name}|${styles['background-color'] ?? ''}|${styles['border-radius'] ?? ''}|${styles['font-size'] ?? ''}`;
      const current: ComponentGroup = groups.get(key) ?? { name, kind: node.kind, count: 0, nodeIds: [], textSamples: [], rectSamples: [], styles };
      current.count += 1;
      current.nodeIds.push(node.id);
      if (node.text && current.textSamples.length < 4) current.textSamples.push(node.text.slice(0, 120));
      if (current.rectSamples.length < 3) current.rectSamples.push(node.rect);
      groups.set(key, current);
    }
    return Array.from(groups.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 36)
      .map((item) => ({ ...item, nodeIds: item.nodeIds.slice(0, 16) }));
  }

  function buildLayoutRegions(nodes: any[]) {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const selected: any[] = [];
    for (const node of nodes
      .filter((item) => isRegionNode(item))
      .filter((node) => node.rect.width * node.rect.height > 6000)
      .sort((a, b) => a.rect.documentY - b.rect.documentY || b.importance - a.importance)
      .slice(0, 80)) {
      if (selected.some((item) => isNestedDuplicate(item.rect, node.rect))) continue;
      selected.push(node);
      if (selected.length >= 40) break;
    }
    return selected.map((node) => ({
        id: node.id,
        kind: node.kind,
        label: (node.accessibleName || node.text || '').slice(0, 120) || undefined,
        selector: node.selector,
        rect: node.rect,
        childKinds: Array.from(new Set(node.childIds.map((id: string) => byId.get(id)?.kind).filter(Boolean))).slice(0, 8)
      }));
  }

  function buildStateHints(nodes: any[]) {
    const groups = new Map<string, { state: string; confidence: 'low' | 'medium' | 'high'; nodeIds: string[]; evidence: string[] }>();
    for (const node of nodes) {
      const state = stateName(node);
      if (!state) continue;
      const current = groups.get(state) ?? { state, confidence: node.kind === 'skeleton' ? 'high' : 'medium', nodeIds: [], evidence: [] };
      current.nodeIds.push(node.id);
      const sample = (node.text || node.selector || node.kind).slice(0, 120);
      if (sample && current.evidence.length < 5) current.evidence.push(sample);
      groups.set(state, current);
    }
    return Array.from(groups.values()).map((item) => ({ ...item, nodeIds: item.nodeIds.slice(0, 12) }));
  }

  function componentName(node: any): string {
    if (node.kind === 'nav') return 'navigation';
    if (node.kind === 'event-card') return 'event-card';
    if (node.kind === 'partner-grid') return 'partner-grid';
    if (node.kind === 'skeleton') return 'loading-skeleton';
    return node.kind;
  }

  function styleSummary(styles: Record<string, string>): Record<string, string> {
    const keys = ['background-color', 'background-image', 'color', 'border-color', 'border-radius', 'box-shadow', 'font-size', 'font-weight', 'display', 'gap', 'padding', 'max-width'];
    return Object.fromEntries(keys.map((key) => [key, styles[key]]).filter(([, value]) => value));
  }

  function stateName(node: any): string | undefined {
    const haystack = `${node.kind} ${node.text ?? ''} ${node.accessibleName ?? ''} ${node.selector} ${node.classSample ?? ''} ${node.styles['animation-name'] ?? ''}`.toLowerCase();
    if (node.kind === 'skeleton' || /(skeleton|shimmer|placeholder|pulse)/.test(haystack)) return 'loading-skeleton';
    if (/\b(loading|please wait)\b/.test(haystack)) return 'loading';
    if (/\b(error|failed|invalid)\b/.test(haystack)) return 'error';
    if (/\b(empty|no results|nothing found)\b/.test(haystack)) return 'empty';
    if (/\b(success|complete|ready)\b/.test(haystack)) return 'success';
    if (/\b(disabled|inactive)\b/.test(haystack)) return 'disabled-or-dimmed';
    return undefined;
  }

  function isRegionNode(node: any): boolean {
    if (['header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 'form'].includes(node.tag)) return true;
    return ['hero', 'section', 'footer'].includes(node.kind) && ['div', 'section', 'main'].includes(node.tag);
  }

  function isNestedDuplicate(a: any, b: any): boolean {
    const sameY = Math.abs(a.documentY - b.documentY) < 8;
    const sameSize = Math.abs(a.width - b.width) < 24 && Math.abs(a.height - b.height) < 24;
    const contained = b.documentY >= a.documentY && b.documentY <= a.documentY + a.height && b.width <= a.width + 8 && b.height <= a.height + 8;
    return (sameY && sameSize) || contained;
  }

  function collectLengths(map: Map<string, number>, values: Array<string | undefined>): void {
    for (const value of values) {
      if (!value) continue;
      for (const match of value.matchAll(/(?:^|\s)(-?\d+(?:\.\d+)?px|0)(?:\s|$)/g)) {
        const length = match[1] === '0' ? '0px' : match[1];
        if (length.startsWith('-')) continue;
        map.set(length, (map.get(length) ?? 0) + 1);
      }
    }
  }

  function roleLengths(map: Map<string, number>, roles: string[]) {
    const common = Array.from(map.entries())
      .filter(([value]) => value === '0px' || Number.parseFloat(value) <= 240)
      .sort((a, b) => b[1] - a[1] || Number.parseFloat(a[0]) - Number.parseFloat(b[0]))
      .slice(0, roles.length);
    return common
      .sort((a, b) => Number.parseFloat(a[0]) - Number.parseFloat(b[0]))
      .map(([value, count], index) => ({ role: roles[index] ?? `step-${index + 1}`, value, count }));
  }

  function normalizeColor(input: string | undefined): string | undefined {
    if (!input) return undefined;
    const value = input.trim().toLowerCase();
    if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || value === 'rgba(0,0,0,0)') return undefined;
    if (/^#[0-9a-f]{3}$/.test(value)) return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    if (/^#[0-9a-f]{6}$/.test(value)) return value;
    const rgb = value.match(/^rgba?\(([^)]+)\)$/);
    if (!rgb) return value.includes('gradient(') ? value : undefined;
    const parts = rgb[1].split(',').map((part) => part.trim());
    const [r, g, b] = parts.slice(0, 3).map((part) => Math.max(0, Math.min(255, Math.round(Number.parseFloat(part) || 0))));
    const alpha = parts[3] === undefined ? 1 : Number.parseFloat(parts[3]);
    if (alpha <= 0.02) return undefined;
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    return alpha >= 0.98 ? hex : `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
  }

  function toHex(value: number): string {
    return value.toString(16).padStart(2, '0');
  }

  function classifyColor(value: string, usageCount: number, area: number, backgroundArea: number): string {
    if (!value.startsWith('#')) return value.includes('gradient') ? 'gradient' : 'effect';
    const rgb = {
      r: Number.parseInt(value.slice(1, 3), 16),
      g: Number.parseInt(value.slice(3, 5), 16),
      b: Number.parseInt(value.slice(5, 7), 16)
    };
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    if (luminance > 0.93) return backgroundArea > 20000 ? 'canvas' : 'inverse-text';
    if (luminance > 0.82) return backgroundArea > 8000 ? 'surface' : 'surface-muted';
    if (luminance < 0.08) return backgroundArea > 8000 ? 'ink' : 'body';
    if (usageCount > 8 && area < 20000) return 'primary';
    if (luminance < 0.35) return 'muted';
    return usageCount > 3 ? 'accent' : 'border';
  }

  function classifyTypography(sizeValue: string, weight: string): string {
    const size = Number.parseFloat(sizeValue);
    const numericWeight = Number.parseFloat(weight);
    if (size >= 56) return 'display-xl';
    if (size >= 42) return 'display-lg';
    if (size >= 32) return 'display-md';
    if (size >= 24) return 'title-lg';
    if (size >= 18 && numericWeight >= 600) return 'title-md';
    if (size <= 13) return 'caption';
    if (numericWeight >= 600) return 'button';
    return size <= 15 ? 'body-sm' : 'body';
  }

  function detectFrameworks(): string[] {
    const html = document.documentElement.innerHTML.slice(0, 200000);
    const hints: string[] = [];
    if (document.querySelector('#__next, [data-nextjs]')) hints.push('Next.js');
    if (document.querySelector('#__nuxt, [data-nuxt]')) hints.push('Nuxt');
    if (html.includes('astro-island')) hints.push('Astro');
    if (html.includes('__sveltekit')) hints.push('SvelteKit');
    if (html.includes('Shopify') || document.querySelector('[id^="shopify"]')) hints.push('Shopify');
    if (html.includes('Webflow') || document.querySelector('.w-layout-blockcontainer')) hints.push('Webflow');
    if (html.includes('Squarespace')) hints.push('Squarespace');
    if (html.includes('wp-content') || document.querySelector('body[class*="wp-"]')) hints.push('WordPress');
    if (html.includes('tailwind') || document.querySelector('[class*="sm:"], [class*="md:"], [class*="lg:"]')) hints.push('Tailwind');
    if (html.includes('framer-') || document.querySelector('[data-framer-name]')) hints.push('Framer');
    return Array.from(new Set(hints));
  }

  function redactText(input: string): string {
    return input
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
      .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[PHONE]')
      .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[CARD]')
      .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[TOKEN]');
  }

  function redactUrl(input: string): string {
    try {
      const url = new URL(input);
      for (const key of Array.from(url.searchParams.keys())) {
        if (['token', 'key', 'password', 'session', 'auth', 'code', 'state'].includes(key.toLowerCase())) url.searchParams.set(key, '[REDACTED]');
      }
      return url.toString();
    } catch {
      return redactText(input);
    }
  }

  function round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
