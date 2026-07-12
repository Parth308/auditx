import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { ScanResult, Config } from './types.js';

interface CacheData {
  version: string;
  projectHash: string;
  results: ScanResult[];
}

export class CacheManager {
  private cachePath: string;

  constructor(targetDir: string) {
    this.cachePath = path.join(targetDir, '.auditx-cache.json');
  }

  async getProjectHash(targetDir: string, config: Config): Promise<string> {
    const hash = createHash('md5');
    
    // Mix in relevant config options so cache busts if user changes parameters
    const configStr = JSON.stringify({
      skip: config.skip,
      only: config.only,
      exclude: config.exclude,
      severity: config.severity,
      baseline: config.baseline,
      stagedFiles: config.stagedFiles
    });
    hash.update(configStr);

    async function walk(currentDir: string) {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name === 'node_modules' || 
          entry.name === '.git' || 
          entry.name === 'dist' || 
          entry.name === 'build' || 
          entry.name.startsWith('.auditx-cache.json') ||
          entry.name.startsWith('audit-report') ||
          entry.name.startsWith('sbom.json')
        ) {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);
        
        // Skip user-excluded files/folders
        if (config.exclude && config.exclude.length > 0) {
          const normalizedPath = fullPath.replace(/\\/g, '/');
          const isExcluded = config.exclude.some((ex) => {
            const normalizedEx = ex.replace(/\\/g, '/');
            return normalizedPath.includes(normalizedEx);
          });
          if (isExcluded) {
            continue;
          }
        }
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          try {
            const stats = await fs.promises.stat(fullPath);
            hash.update(fullPath + stats.mtimeMs);
          } catch {
            // ignore files that might be deleted during walk
          }
        }
      }
    }

    await walk(targetDir);
    return hash.digest('hex');
  }

  async loadCache(targetDir: string, currentVersion: string, config: Config): Promise<ScanResult[] | null> {
    if (!fs.existsSync(this.cachePath)) return null;
    
    try {
      const data: CacheData = JSON.parse(await fs.promises.readFile(this.cachePath, 'utf8'));
      if (data.version !== currentVersion) return null; // Cache invalidated due to upgrade
      
      const currentHash = await this.getProjectHash(targetDir, config);
      if (data.projectHash === currentHash) {
        return data.results;
      }
      return null;
    } catch {
      return null; // Bad cache file
    }
  }

  async saveCache(targetDir: string, currentVersion: string, config: Config, results: ScanResult[]): Promise<void> {
    try {
      const currentHash = await this.getProjectHash(targetDir, config);
      const data: CacheData = {
        version: currentVersion,
        projectHash: currentHash,
        results
      };
      await fs.promises.writeFile(this.cachePath, JSON.stringify(data), 'utf8');
    } catch (err: any) {
      console.error('Cache save error:', err);
    }
  }
}
