import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export class FontDownloader {
    private fontsCache: Map<string, string> = new Map();
    private fontDir: string;

    constructor(fontDir: string) {
        this.fontDir = fontDir;
        if (!fs.existsSync(this.fontDir)) {
            fs.mkdirSync(this.fontDir, { recursive: true });
        }
    }

    /**
     * Convert font family name to GitHub folder name (lowercase alphanumeric only)
     * Example: "Momo Signature" -> "momosignature"
     */
    private toGithubFontName(fontFamily: string): string {
        return fontFamily.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    /**
     * Download a file from a URL synchronously using curl
     */
    private downloadFileSync(url: string, outputPath: string): void {
        try {
            execSync(`curl -L -s -f -o "${outputPath}" "${url}"`, { stdio: 'pipe' });
            if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
                throw new Error(`Failed to download ${url}`);
            }
        } catch (err) {
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
            throw err;
        }
    }

    /**
     * List all .ttf files in a GitHub directory
     */
    private listGithubDirectoryFiles(githubFontName: string, directory: string): string[] {
        const url = `https://github.com/google/fonts/tree/main/${directory}/${githubFontName}`;
        
        try {
            console.log(`Fetching directory listing from: ${url}`);
            const html = execSync(`curl -L -s "${url}"`, {
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });

            // Extract JSON from the embeddedData script tag
            const scriptRegex = /<script type="application\/json" data-target="react-app\.embeddedData">({.*?})<\/script>/s;
            const scriptMatch = scriptRegex.exec(html);
            
            if (!scriptMatch) {
                throw new Error('Could not find embedded data in GitHub page');
            }

            const embeddedData = JSON.parse(scriptMatch[1]);
            const ttfFiles: string[] = [];

            // Navigate to tree.items in the JSON structure
            if (embeddedData.payload?.tree?.items) {
                const items = embeddedData.payload.tree.items;
                
                for (const item of items) {
                    // Filter for .ttf files (contentType: "file" and name ends with .ttf)
                    if (item.contentType === 'file' && item.name && item.name.endsWith('.ttf')) {
                        ttfFiles.push(item.name);
                    }
                }
            }

            return ttfFiles;
        } catch (err) {
            throw new Error(`Failed to list directory: ${url} - ${err}`);
        }
    }

    /**
     * Choose the best font file from a list of available files
     * Prioritizes variable fonts, then regular variants
     */
    private chooseBestFontFile(files: string[]): string | null {
        if (files.length === 0) return null;

        // Priority order:
        // 1. Variable fonts with [wght] (most flexible)
        // 2. Variable fonts with other axes
        // 3. Regular static fonts
        // 4. Any other font

        // Sort files by length ascending
        const sortedFiles = files.sort((a, b) => a.length - b.length);

        // Check for variable fonts with [wght]
        const wghtVariable = sortedFiles.find(f => f.includes('[wght]'));
        if (wghtVariable) return wghtVariable;

        // Check for other variable fonts
        const anyVariable = sortedFiles.find(f => f.includes('[') && f.includes(']'));
        if (anyVariable) return anyVariable;

        // Check for Regular variant
        const regular = sortedFiles.find(f => f.includes('Regular.ttf'));
        if (regular) return regular;

        // Return first .ttf file
        return files[0];
    }

    /**
     * Try to find and download the font file from GitHub in a specific directory
     */
    private tryDownloadFromGithub(fontFamily: string, githubFontName: string, directory: string): string | null {
        const outputFilename = `${fontFamily}.ttf`;
        const outputPath = path.join(this.fontDir, outputFilename);

        // Check if file already exists
        if (fs.existsSync(outputPath)) {
            console.log(`Font already exists: ${outputFilename}`);
            return outputFilename;
        }

        // List available files in the directory
        const availableFiles = this.listGithubDirectoryFiles(githubFontName, directory);
        
        if (availableFiles.length === 0) {
            console.log('No .ttf files found in directory');
            return null;
        }

        console.log(`Found ${availableFiles.length} font file(s):`);
        availableFiles.forEach(f => console.log(`  - ${f}`));

        // Choose the best file
        const bestFile = this.chooseBestFontFile(availableFiles);
        
        if (!bestFile) {
            console.log('Could not determine best font file');
            return null;
        }

        console.log(`Selected: ${bestFile}`);

        // Download the chosen file (URL encode the filename for special characters like [])
        const baseUrl = `https://raw.githubusercontent.com/google/fonts/main/${directory}/${githubFontName}`;
        const encodedFilename = encodeURIComponent(bestFile);
        const url = `${baseUrl}/${encodedFilename}`;

        try {
            this.downloadFileSync(url, outputPath);
            console.log(`Successfully downloaded: ${outputFilename}`);
            return outputFilename;
        } catch (err) {
            console.error(`Failed to download ${bestFile}: ${err}`);
            return null;
        }
    }

    /**
     * Download a Google Font from GitHub and return the path to the font file
     */
    downloadFont(fontFamily: string): string {
        // Check cache
        if (this.fontsCache.has(fontFamily)) {
            return this.fontsCache.get(fontFamily)!;
        }

        console.log(`Downloading Google Font: ${fontFamily}`);

        // Convert to GitHub folder name
        const githubFontName = this.toGithubFontName(fontFamily);
        
        // Try multiple directories in order
        const directories = ['ofl', 'apache', 'ufl'];
        const triedDirectories: string[] = [];
        
        for (const directory of directories) {
            console.log(`Trying folder: ${directory}/${githubFontName}`);
            triedDirectories.push(`${directory}/${githubFontName}`);
            
            try {
                const fontPath = this.tryDownloadFromGithub(fontFamily, githubFontName, directory);
                
                if (fontPath) {
                    // Cache the result
                    this.fontsCache.set(fontFamily, fontPath);
                    return fontPath;
                }
            } catch (err) {
                console.log(`Not found in ${directory}, trying next directory...`);
            }
        }

        // If we get here, the font wasn't found in any directory
        throw new Error(
            `Failed to download font "${fontFamily}" from GitHub.\n` +
            `Tried folders: ${triedDirectories.join(', ')}\n` +
            `The font may not exist in the Google Fonts repository.`
        );
    }

    /**
     * Get the cached font path if it exists
     */
    getCachedFont(fontFamily: string): string | null {
        return this.fontsCache.get(fontFamily) || null;
    }

    /**
     * Clear the cache
     */
    clearCache(): void {
        this.fontsCache.clear();
    }
}

