import { Plugin, BeforeFileTranspileEvent, AfterFileTranspileEvent, isBrsFile, isXmlFile, WalkMode, createVisitor, TokenKind, ProgramBuilder, Program } from 'brighterscript';
import { FontDownloader } from './font-downloader';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Scan file content for googleFont: references
 */
function scanForGoogleFonts(content: string, fontsSet: Set<string>): void {
    const regex = /googleFont:([a-zA-Z0-9\s+]+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        fontsSet.add(match[1].trim());
    }
}

export default function googleFontsPlugin() {
    let fontDownloader: FontDownloader;
    let fontsDir: string;
    let stagingDir: string;

    return {
        name: 'google-fonts-plugin',

        afterProgramCreate: (program: Program) => {
            // Initialize FontDownloader with path relative to rootDir
            const rootDir = program.options.rootDir || process.cwd();
            fontsDir = path.join(rootDir, 'fonts');
            stagingDir = program.options.stagingDir || path.join(process.cwd(), 'out', 'staging');
            fontDownloader = new FontDownloader(fontsDir);
        },

        beforePrepublish: (builder: ProgramBuilder) => {
            const program = builder.program;
            if (!program) return;
            
            // Pre-download all fonts before transpilation/staging
            console.log('Scanning for Google Fonts...');
            const fontsToDownload = new Set<string>();

            // Scan all files for googleFont: references
            for (const file of Object.values(program.files)) {
                if (isBrsFile(file) || isXmlFile(file)) {
                    const content = file.fileContents || '';
                    scanForGoogleFonts(content, fontsToDownload);
                }
            }

            // Download all fonts
            if (fontsToDownload.size > 0) {
                console.log(`Found ${fontsToDownload.size} Google Font(s) to download`);
                for (const fontFamily of fontsToDownload) {
                    try {
                        fontDownloader.downloadFont(fontFamily);
                    } catch (err) {
                        console.error(`Failed to download "${fontFamily}": ${err}`);
                    }
                }
            }
        },

        afterPrepublish: (builder: ProgramBuilder) => {
            // Ensure fonts are copied to staging directory
            const stagingFontsDir = path.join(stagingDir, 'fonts');
            
            if (!fs.existsSync(fontsDir)) {
                return;
            }

            // Create staging fonts directory if it doesn't exist
            if (!fs.existsSync(stagingFontsDir)) {
                fs.mkdirSync(stagingFontsDir, { recursive: true });
            }

            // Copy all font files to staging
            const fontFiles = fs.readdirSync(fontsDir);
            for (const fontFile of fontFiles) {
                if (fontFile.endsWith('.ttf') || fontFile.endsWith('.otf')) {
                    const srcPath = path.join(fontsDir, fontFile);
                    const destPath = path.join(stagingFontsDir, fontFile);
                    
                    try {
                        fs.copyFileSync(srcPath, destPath);
                        console.log(`Copied font to staging: ${fontFile}`);
                    } catch (err) {
                        console.error(`Failed to copy font "${fontFile}" to staging: ${err}`);
                    }
                }
            }
        },

        beforeFileTranspile: (event: BeforeFileTranspileEvent) => {
            // Handle BrightScript files
            if (isBrsFile(event.file)) {
                event.file.ast.walk(createVisitor({
                    LiteralExpression: (literal) => {
                        if (literal.token.kind === TokenKind.StringLiteral && literal.token.text.includes('googleFont:')) {
                            const newText = literal.token.text.replaceAll(/googleFont:([a-zA-Z0-9\s+]+)/g, (_match: string, fontFamily: string) => {
                                try {
                                    const fontPath = fontDownloader.downloadFont(fontFamily.trim());
                                    return `pkg:/fonts/${fontPath}`;
                                } catch (err) {
                                    console.error(`Failed to download font "${fontFamily}": ${err}`);
                                    return _match; // Keep original on error
                                }
                            });
                            if (newText !== literal.token.text) {
                                event.editor.setProperty(literal.token, 'text', newText);
                            }
                        }
                    }
                }), {
                    walkMode: WalkMode.visitExpressionsRecursive
                });
            }
        },

        afterFileTranspile: (event: AfterFileTranspileEvent) => {
            // Handle XML files - modify transpiled output
            if (isXmlFile(event.file)) {
                const regex = /googleFont:([a-zA-Z0-9\s+]+)/g;
                
                if (regex.test(event.code)) {
                    event.code = event.code.replaceAll(/googleFont:([a-zA-Z0-9\s+]+)/g, (_match: string, fontFamily: string) => {
                        try {
                            const fontPath = fontDownloader.downloadFont(fontFamily.trim());
                            return `pkg:/fonts/${fontPath}`;
                        } catch (err) {
                            console.error(`Failed to download font "${fontFamily}": ${err}`);
                            return _match; // Keep original on error
                        }
                    });
                }
            }
        }
    } as Plugin;
}
