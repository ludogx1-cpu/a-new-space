// Where the plugin keeps its licence state, the AI model and the AI runtime.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

export function homeDir() {
    const dir = process.env.GOLDEN_PAW_HOME || join(homedir(), '.golden-paw-animate');
    mkdirSync(dir, { recursive: true });
    return dir;
}
