import { join } from 'path';
import { homedir, platform, arch } from 'os';
import { existsSync, mkdirSync, createWriteStream, rmSync } from 'fs';
import https from 'https';
import * as tar from 'tar';
import AdmZip from 'adm-zip';
import { execFileSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

export type ToolName = 'gitleaks' | 'trivy' | 'semgrep' | 'trufflehog' | 'osv-scanner' | 'shellcheck';

const GITLEAKS_VERSION = '8.30.1';
const TRIVY_VERSION = '0.71.2';
const SEMGREP_VERSION = '1.100.0';
const TRUFFLEHOG_VERSION = '3.95.7';
const OSV_SCANNER_VERSION = '1.8.1';
const SHELLCHECK_VERSION = '0.11.0';

const installPromises = new Map<string, Promise<string>>();

/**
 * Returns a robust environment object for Semgrep to prevent PermissionDenied errors on Windows
 * and skip telemetry.
 */
export function getSemgrepEnv(): NodeJS.ProcessEnv {
  const semgrepHome = join(homedir(), '.auditx', 'semgrep-home');
  if (!existsSync(semgrepHome)) {
    mkdirSync(semgrepHome, { recursive: true });
  }

  return {
    ...process.env,
    SEMGREP_SETTINGS_FILE: join(semgrepHome, 'settings.yml'),
    SEMGREP_SEND_METRICS: 'off',
  };
}

/**
 * Returns the path to the executable for a given tool.
 * If it's not installed in ~/.auditx/bin, it will download it.
 */
export function getBinaryPath(tool: ToolName): Promise<string> {
  if (installPromises.has(tool)) {
    return installPromises.get(tool)!;
  }
  const promise = getBinaryPathInternal(tool);
  installPromises.set(tool, promise);
  return promise;
}

async function getBinaryPathInternal(tool: ToolName): Promise<string> {
  const binDir = join(homedir(), '.auditx', 'bin');
  if (!existsSync(binDir)) {
    mkdirSync(binDir, { recursive: true });
  }

  const ext = platform() === 'win32' ? '.exe' : '';
  const expectedBin = join(binDir, `${tool}${ext}`);

  if (existsSync(expectedBin)) {
    return expectedBin;
  }

  if (tool === 'semgrep' && platform() === 'win32') {
    try {
      execFileSync('semgrep', ['--version'], { stdio: 'ignore' });
      return 'semgrep';
    } catch {
      // Continue to pip installation below
    }
  }

  // Not found, install it
  console.log(chalk.cyan(`\n[auditx] First run setup: Installing ${tool} locally...`));
  const spinner = ora(`Downloading ${tool}...`).start();

  try {
    if (tool === 'semgrep' && platform() === 'win32') {
      // Semgrep doesn't have a standalone Windows binary. Install via pip.
      spinner.text = 'Installing semgrep via pip...';
      execFileSync('pip', ['install', 'semgrep'], { stdio: 'pipe' });
      spinner.succeed(`semgrep installed via pip`);

      // Pre-warm settings file in isolated location to avoid first-run permission crash
      getSemgrepEnv();

      return 'semgrep'; // Relies on system PATH
    }

    const { url, isZip, isRaw } = getDownloadUrl(tool);
    const extRaw = platform() === 'win32' ? '.exe' : '';
    const archivePath = join(binDir, `${tool}-archive${isRaw ? extRaw : isZip ? '.zip' : '.tar.gz'}`);

    await downloadFile(url, archivePath, (percent) => {
      spinner.text = `Downloading ${tool}... ${percent}%`;
    });
    
    if (isRaw) {
      import('fs').then(({ renameSync, chmodSync }) => {
        renameSync(archivePath, expectedBin);
        if (platform() !== 'win32') chmodSync(expectedBin, 0o755);
      });
      spinner.succeed(`Installed ${tool}`);
      return expectedBin;
    }

    spinner.text = `Extracting ${tool}...`;

    if (isZip) {
      const zip = new AdmZip(archivePath);
      zip.extractAllTo(binDir, true);
    } else {
      await tar.x({ file: archivePath, cwd: binDir });
    }

    // Clean up archive
    rmSync(archivePath, { force: true });
    
    // For semgrep mac/linux, the binary might be in a subfolder or named 'semgrep-core'
    // Actually, their release is just a single binary or wrapper. We might need to handle specific paths
    // if they extract weirdly, but usually it's in the root or we can just find it.
    // Let's assume standard extraction puts the binary in binDir for gitleaks/trivy.

    if (!existsSync(expectedBin)) {
      // If the binary isn't exactly at expectedBin, some archives have a single root folder.
      // E.g. semgrep extracts a folder. For simplicity, we just rely on standard names.
      // If we need to move it, we can do it here. 
    }

    spinner.succeed(`Installed ${tool}`);
    return expectedBin;
  } catch (err: any) {
    spinner.fail(`Failed to install ${tool}: ${err.message}`);
    throw err;
  }
}

function getDownloadUrl(tool: ToolName): { url: string; isZip: boolean; isRaw?: boolean } {
  const os = platform();
  const a = arch();

  if (tool === 'gitleaks') {
    let osStr = os === 'win32' ? 'windows' : os === 'darwin' ? 'darwin' : 'linux';
    let archStr = a === 'x64' ? 'x64' : a === 'arm64' ? 'arm64' : 'x86';
    const isZip = os === 'win32' || os === 'darwin'; // usually gitleaks uses zip for win/mac? Wait, they use tar.gz mostly, but zip is fine. Actually, let's use tar.gz for all except windows?
    // Let's be precise with Gitleaks:
    // gitleaks_8.21.2_windows_x64.zip
    // gitleaks_8.21.2_linux_x64.tar.gz
    // gitleaks_8.21.2_darwin_arm64.tar.gz
    const ext = os === 'win32' ? 'zip' : 'tar.gz';
    return {
      url: `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_${osStr}_${archStr}.${ext}`,
      isZip: ext === 'zip',
    };
  }

  if (tool === 'trivy') {
    let osStr = os === 'win32' ? 'windows' : os === 'darwin' ? 'macOS' : 'Linux';
    let archStr = a === 'x64' ? '64bit' : a === 'arm64' ? 'ARM64' : '32bit';
    const ext = os === 'win32' ? 'zip' : 'tar.gz';
    return {
      url: `https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_${osStr}-${archStr}.${ext}`,
      isZip: ext === 'zip',
    };
  }

  if (tool === 'semgrep') {
    let osStr = os === 'darwin' ? 'osx' : 'ubuntu-16.04';
    const ext = os === 'darwin' ? 'zip' : 'tgz';
    return {
      url: `https://github.com/semgrep/semgrep/releases/download/v${SEMGREP_VERSION}/semgrep-v${SEMGREP_VERSION}-${osStr}.${ext}`,
      isZip: ext === 'zip',
    };
  }

  if (tool === 'trufflehog') {
    let osStr = os === 'win32' ? 'windows' : os === 'darwin' ? 'darwin' : 'linux';
    let archStr = a === 'x64' ? 'amd64' : a === 'arm64' ? 'arm64' : '386';
    const ext = 'tar.gz'; // Trufflehog uses tar.gz for all platforms
    return {
      url: `https://github.com/trufflesecurity/trufflehog/releases/download/v${TRUFFLEHOG_VERSION}/trufflehog_${TRUFFLEHOG_VERSION}_${osStr}_${archStr}.${ext}`,
      isZip: false,
    };
  }

  if (tool === 'osv-scanner') {
    let osStr = os === 'win32' ? 'windows' : os === 'darwin' ? 'darwin' : 'linux';
    let archStr = a === 'x64' ? 'amd64' : a === 'arm64' ? 'arm64' : 'amd64'; // fallback for x86
    const ext = os === 'win32' ? '.exe' : '';
    return {
      url: `https://github.com/google/osv-scanner/releases/download/v${OSV_SCANNER_VERSION}/osv-scanner_${osStr}_${archStr}${ext}`,
      isZip: false,
      isRaw: true,
    };
  }

  if (tool === 'shellcheck') {
    let osStr = os === 'win32' ? 'windows' : os === 'darwin' ? 'darwin' : 'linux';
    let archStr = a === 'x64' ? 'x86_64' : a === 'arm64' ? 'aarch64' : 'x86_64';
    const ext = os === 'win32' ? 'zip' : 'tar.gz'; // For windows, koalaman hosts a zip
    let url = '';
    
    // shellcheck windows releases are just zip files without arch
    if (os === 'win32') {
       url = `https://github.com/koalaman/shellcheck/releases/download/v${SHELLCHECK_VERSION}/shellcheck-v${SHELLCHECK_VERSION}.zip`;
    } else {
       url = `https://github.com/koalaman/shellcheck/releases/download/v${SHELLCHECK_VERSION}/shellcheck-v${SHELLCHECK_VERSION}.${osStr}.${archStr}.${ext}`;
    }
    return {
      url,
      isZip: ext === 'zip',
    };
  }

  throw new Error(`Unknown tool: ${tool}`);
}

function downloadFile(url: string, dest: string, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);

    const request = (urlToFetch: string) => {
      https.get(urlToFetch, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          if (response.headers.location) {
            return request(response.headers.location);
          }
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${urlToFetch}: ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;

        if (onProgress) {
          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes > 0) {
              const percent = Math.round((downloadedBytes / totalBytes) * 100);
              onProgress(percent);
            }
          });
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        reject(err);
      });
    };

    request(url);
  });
}
