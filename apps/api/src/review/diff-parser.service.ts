import { Injectable } from '@nestjs/common';
import parseDiff from 'parse-diff';

export interface ValidLineRange {
  start: number;
  end: number;
}

@Injectable()
export class DiffParserService {
  /**
   * Determines if a file should be ignored based on glob-like patterns.
   */
  shouldIgnoreFile(filename: string, ignoredPatterns: string[]): boolean {
    for (const pattern of ignoredPatterns) {
      const cleanPattern = pattern.replace(/^\*\*\//, '').replace(/\/\*\*$/, '');
      if (pattern.startsWith('*.')) {
        const ext = pattern.substring(1);
        if (filename.endsWith(ext)) return true;
      }
      if (filename.includes(cleanPattern) || filename.endsWith(cleanPattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extracts modified/added line numbers from a git patch string.
   * This is critical because GitHub only allows inline review comments on lines present in the diff.
   */
  getValidLineNumbers(patch?: string): Set<number> {
    const validLines = new Set<number>();
    if (!patch) return validLines;

    try {
      const parsed = parseDiff(patch);
      for (const file of parsed) {
        for (const chunk of file.chunks) {
          for (const change of chunk.changes) {
            if (change.type === 'add' || change.type === 'normal') {
              if ('ln2' in change && typeof change.ln2 === 'number') {
                validLines.add(change.ln2);
              }
            }
          }
        }
      }
    } catch {
      // Fallback: simple regex scan of hunk headers @@ -a,b +c,d @@
      const hunkHeaderRegex = /@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/g;
      let match: RegExpExecArray | null;
      while ((match = hunkHeaderRegex.exec(patch)) !== null) {
        const start = parseInt(match[1], 10);
        const count = match[2] ? parseInt(match[2], 10) : 1;
        for (let i = 0; i < count; i++) {
          validLines.add(start + i);
        }
      }
    }

    return validLines;
  }

  /**
   * Finds the closest valid diff line if the exact line is slightly outside.
   */
  findClosestValidLine(targetLine: number, validLines: Set<number>): number | null {
    if (validLines.has(targetLine)) return targetLine;

    let closest: number | null = null;
    let minDistance = 5; // Look up to 5 lines away

    for (const line of validLines) {
      const dist = Math.abs(line - targetLine);
      if (dist < minDistance) {
        minDistance = dist;
        closest = line;
      }
    }

    return closest;
  }
}
