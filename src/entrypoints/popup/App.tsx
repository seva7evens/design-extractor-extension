import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import type { GeneratedArtifacts, GeminiModel, GeminiSettings, GenerationState, ProgressEvent } from '@/lib/extraction/types';
import type { GeminiValidationResult } from '@/lib/gemini/client';
import { DEFAULT_GEMINI_MODEL, chooseDefaultModel, displayModelName, filterTextModels, filterVisionModels } from '@/lib/gemini/model-filter';
import type { RuntimeRequest, RuntimeResponse } from '@/lib/messaging/protocol';

type KeyStatus = 'unknown' | 'valid' | 'invalid' | 'quota' | 'error';

const DEFAULT_SETTINGS: GeminiSettings = {
  visionModel: DEFAULT_GEMINI_MODEL,
  textModel: DEFAULT_GEMINI_MODEL,
  captureMode: 'fullPage',
  includeEvidenceJson: true,
  includeVisualReportJson: true,
  includeRawCssVariables: false,
  includeMobileEvidence: true,
  cachedModels: []
};

export default function App() {
  const [settings, setSettings] = useState<GeminiSettings>(DEFAULT_SETTINGS);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('unknown');
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [artifacts, setArtifacts] = useState<GeneratedArtifacts | null>(null);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);

  const visionModels = useMemo(() => filterVisionModels(settings.cachedModels), [settings.cachedModels]);
  const textModels = useMemo(() => filterTextModels(settings.cachedModels), [settings.cachedModels]);
  const currentStep = events.at(-1)?.step ?? (busy ? 'Starting' : artifacts ? 'Ready' : 'Idle');

  useEffect(() => {
    send<GeminiSettings>({ type: 'GET_SETTINGS' }).then((loaded) => {
      setSettings({ ...DEFAULT_SETTINGS, ...loaded });
      setApiKeyInput(loaded.apiKey ?? '');
      setKeyStatus(loaded.apiKey && loaded.cachedModels.length ? 'valid' : 'unknown');
    });
    send<GenerationState>({ type: 'GET_GENERATION_STATE' }).then(applyGenerationState).catch(() => undefined);
  }, []);

  useEffect(() => {
    const listener = (message: any) => {
      if (message?.type !== 'PROGRESS_EVENT') return;
      setEvents((current) => [...current, message.event].slice(-3));
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  function applyGenerationState(state: GenerationState): void {
    if (state.status === 'idle') return;
    const started = state.startedAt ? Date.parse(state.startedAt) : null;
    const ended = state.endedAt ? Date.parse(state.endedAt) : null;
    setEvents(state.events);
    if (state.status === 'running') {
      setBusy(true);
      setError(null);
      setArtifacts(null);
      setStartedAt(Number.isFinite(started) && started ? started : Date.now());
      if (Number.isFinite(started) && started) setElapsed(Math.round((Date.now() - started) / 1000));
      return;
    }
    setBusy(false);
    setStartedAt(null);
    if (Number.isFinite(started) && Number.isFinite(ended) && started && ended) setElapsed(Math.max(0, Math.round((ended - started) / 1000)));
    if (state.status === 'succeeded') {
      setError(null);
      setArtifacts(state.artifacts ?? null);
      return;
    }
    if (state.status === 'failed') {
      setArtifacts(null);
      setError(state.error ?? { message: 'Generation failed' });
    }
  }

  async function validateKey() {
    setBusy(true);
    setError(null);
    setElapsed(0);
    setStartedAt(Date.now());
    setEvents([{ step: 'Validating key', message: 'Validating key', at: new Date().toISOString() }]);
    try {
      const result = await send<GeminiValidationResult>({ type: 'VALIDATE_GEMINI_KEY', apiKey: apiKeyInput.trim() });
      setKeyStatus(result.status);
      if (result.status === 'valid') {
        const next = {
          ...settings,
          apiKey: apiKeyInput.trim(),
          cachedModels: result.models,
          modelCacheDate: new Date().toISOString(),
          visionModel: chooseDefaultModel(filterVisionModels(result.models)),
          textModel: chooseDefaultModel(filterTextModels(result.models))
        };
        setSettings(next);
        setEvents((current) => [...current, { step: 'Key valid', message: `Loaded ${result.models.length} models`, at: new Date().toISOString() }].slice(-3));
      } else if (result.status === 'quota') {
        const message = result.message ?? 'Gemini quota limited';
        setError({ message });
        setEvents((current) => [...current, { step: 'Quota limited', message, at: new Date().toISOString() }].slice(-3));
      } else {
        const message = result.message ?? (result.status === 'invalid' ? 'Invalid API key' : 'Gemini validation failed');
        setError({ message });
        setEvents((current) => [...current, { step: result.status === 'invalid' ? 'Invalid API key' : 'Validation error', message, at: new Date().toISOString() }].slice(-3));
      }
    } catch (err) {
      setKeyStatus('unknown');
      setError(normalizeError(err));
      setEvents((current) => [...current, { step: 'Validation failed', message: 'Validation failed', at: new Date().toISOString() }].slice(-3));
    } finally {
      setBusy(false);
      setStartedAt(null);
    }
  }

  async function save(partial: Partial<GeminiSettings>) {
    const next = await send<GeminiSettings>({ type: 'SAVE_SETTINGS', settings: partial });
    setSettings({ ...DEFAULT_SETTINGS, ...next });
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setArtifacts(null);
    setElapsed(0);
    setStartedAt(Date.now());
    setEvents([{ step: 'Checking page access', message: 'Checking page access', at: new Date().toISOString() }]);
    try {
      const result = await send<GeneratedArtifacts>({
        type: 'GENERATE_DESIGN_MD',
        options: {
          captureMode: settings.captureMode,
          includeRawCssVariables: settings.includeRawCssVariables,
        maxNodes: 1000,
        maxTextLength: 240
      }
      });
      setArtifacts(result);
      setEvents((current) => [...current, { step: 'Ready', message: 'DESIGN.md downloaded', at: new Date().toISOString() }].slice(-3));
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy(false);
      setStartedAt(null);
    }
  }

  async function download(filename: string, content?: string, dataUrl?: string, mimeType?: string) {
    await send({ type: 'DOWNLOAD_ARTIFACT', filename, content, dataUrl, mimeType });
  }

  return (
    <main className="popup-shell">
      <header className="topbar">
        <div>
          <h1>Design MD</h1>
          <p>Extract the current page into DESIGN.md</p>
        </div>
        <span className={`status ${keyStatus}`}>{keyStatus}</span>
      </header>

      <section className="field-group">
        <label htmlFor="apiKey">Gemini API key</label>
        <div className="inline-row">
          <input
            id="apiKey"
            type={showKey ? 'text' : 'password'}
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
            placeholder="YOUR GEMINI API KEY"
            autoComplete="off"
          />
          <button type="button" className="quiet" onClick={() => setShowKey((value) => !value)}>
            {showKey ? 'Hide' : 'Show'}
          </button>
          <button type="button" onClick={validateKey} disabled={busy || !apiKeyInput.trim()}>
            Validate
          </button>
        </div>
      </section>

      <section className="grid-two">
        <label>
          <span>Vision model</span>
          <select value={settings.visionModel} onChange={(event) => save({ visionModel: event.target.value })}>
            {visionModels.length ? visionModels.map((model) => option(model)) : <option value={settings.visionModel}>{settings.visionModel}</option>}
          </select>
        </label>
        <label>
          <span>Text model</span>
          <select value={settings.textModel} onChange={(event) => save({ textModel: event.target.value })}>
            {textModels.length ? textModels.map((model) => option(model)) : <option value={settings.textModel}>{settings.textModel}</option>}
          </select>
        </label>
      </section>

      <section className="segmented" aria-label="Capture mode">
        <button className={settings.captureMode === 'viewport' ? 'active' : ''} onClick={() => save({ captureMode: 'viewport' })}>
          Current viewport
        </button>
        <button className={settings.captureMode === 'fullPage' ? 'active' : ''} onClick={() => save({ captureMode: 'fullPage' })}>
          Full page
        </button>
      </section>

      <details className="advanced">
        <summary>Advanced</summary>
        <label>
          <input type="checkbox" checked={settings.includeEvidenceJson} onChange={(event) => save({ includeEvidenceJson: event.target.checked })} />
          Include evidence JSON
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.includeVisualReportJson}
            onChange={(event) => save({ includeVisualReportJson: event.target.checked })}
          />
          Include visual report JSON
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.includeRawCssVariables}
            onChange={(event) => save({ includeRawCssVariables: event.target.checked })}
          />
          Include raw CSS variables
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.includeMobileEvidence}
            onChange={(event) => save({ includeMobileEvidence: event.target.checked })}
          />
          Include mobile viewport evidence
        </label>
      </details>

      <button className="primary" type="button" disabled={busy || keyStatus !== 'valid'} onClick={generate}>
        Generate DESIGN.md
      </button>

      <section className="progress-area">
        <div className="progress-top">
          <span>{currentStep}</span>
          <span>{elapsed}s</span>
        </div>
        <div className={`progress-track ${busy ? 'running' : ''}`}>
          <div />
        </div>
        <ul>
          {events.map((event) => (
            <li key={`${event.at}-${event.step}`}>{event.message}</li>
          ))}
        </ul>
      </section>

      {error && (
        <section className="error">
          <strong>{error.message}</strong>
          {error.details && (
            <details>
              <summary>Details</summary>
              <pre>{error.details}</pre>
            </details>
          )}
        </section>
      )}

      {artifacts && (
        <section className="output">
          <div className="filename">{artifacts.filename}</div>
          <div className="inline-row">
            <button type="button" onClick={() => navigator.clipboard.writeText(artifacts.markdown)}>
              Copy
            </button>
            <button type="button" onClick={() => download(artifacts.filename, artifacts.markdown, undefined, 'text/markdown;charset=utf-8')}>
              Download DESIGN.md
            </button>
          </div>
          <div className="secondary-actions">
            {artifacts.screenshotDataUrl && artifacts.screenshotFilename && (
              <button type="button" onClick={() => download(artifacts.screenshotFilename!, undefined, artifacts.screenshotDataUrl)}>
                Screenshot
              </button>
            )}
            {artifacts.evidence && artifacts.evidenceFilename && (
              <button
                type="button"
                onClick={() => download(artifacts.evidenceFilename!, JSON.stringify(artifacts.evidence, null, 2), undefined, 'application/json')}
              >
                Evidence JSON
              </button>
            )}
            {artifacts.visualReport !== undefined && artifacts.visualReport !== null && artifacts.visualReportFilename && (
              <button
                type="button"
                onClick={() =>
                  download(artifacts.visualReportFilename!, JSON.stringify(artifacts.visualReport, null, 2), undefined, 'application/json')
                }
              >
                Visual report
              </button>
            )}
          </div>
          {artifacts.validationIssues.length > 0 && <p className="warning">Validation warnings: {artifacts.validationIssues.length}</p>}
        </section>
      )}
    </main>
  );
}

function option(model: GeminiModel) {
  const name = displayModelName(model);
  return (
    <option key={model.name} value={name}>
      {name}
    </option>
  );
}

async function send<T = unknown>(request: RuntimeRequest): Promise<T> {
  const response = (await browser.runtime.sendMessage(request)) as RuntimeResponse<T>;
  if (!response?.ok) throw new Error(response?.error?.message ?? 'Request failed');
  return response.data;
}

function normalizeError(error: unknown): { message: string; details?: string } {
  return error instanceof Error ? { message: error.message, details: error.stack } : { message: String(error) };
}
