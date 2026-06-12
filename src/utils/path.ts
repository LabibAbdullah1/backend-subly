import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Going up two levels from src/utils/ (or dist/utils/) to reach project root
export const PROJECT_ROOT = path.resolve(__dirname, '../..');

export function getUploadsPath(subPath: string = '') {
  return path.join(PROJECT_ROOT, 'uploads', subPath);
}
