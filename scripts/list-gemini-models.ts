import 'dotenv/config';
import { listGeminiModels } from '../src/lib/gemini/client';
import { displayModelName, supportsGenerateContent } from '../src/lib/gemini/model-filter';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_API_KEY is missing');
  process.exit(1);
}

const models = await listGeminiModels(apiKey);
for (const model of models) {
  const methods = model.supportedGenerationMethods.join(', ');
  const marker = supportsGenerateContent(model) ? '*' : ' ';
  console.log(`${marker} ${displayModelName(model)} [${methods}]`);
}
