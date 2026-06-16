import { chooseDefaultModel, filterTextModels, filterVisionModels } from '../../src/lib/gemini/model-filter';
import type { GeminiModel } from '../../src/lib/extraction/types';

const models: GeminiModel[] = [
  { name: 'models/imagen-4', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-2.5-flash-image', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-flash-lite', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-pro-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/text-embedding', supportedGenerationMethods: ['embedContent'] }
];

it('filters generateContent models and skips image generation models', () => {
  expect(filterTextModels(models).map((model) => model.name)).toEqual([
    'models/gemini-3.1-flash-lite',
    'models/gemini-3.5-flash',
    'models/gemini-2.5-flash',
    'models/gemini-2.5-flash-lite',
    'models/gemini-3.1-pro-preview'
  ]);
  expect(filterVisionModels(models).length).toBe(5);
});

it('chooses the stable flash-lite default when present', () => {
  expect(chooseDefaultModel(filterTextModels(models))).toBe('gemini-3.1-flash-lite');
});
