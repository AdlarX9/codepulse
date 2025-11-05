// Export utilities for different formats
import type { ScanResult } from '@/types'
import type { GitCommitInfo, GitRepoInfo } from './git'

export type ExportFormat = 'json' | 'csv' | 'markdown' | 'html'

/**
 * Export scan results to JSON
 */
export function exportToJSON(data: ScanResult): string {
	return JSON.stringify(data, null, 2)
}

/**
 * Export scan results to CSV
 */
export function exportToCSV(data: ScanResult): string {
	const lines: string[] = []

	// Header
	lines.push('Metric,Value')

	// Summary metrics
	lines.push(`Total Files,${data.total_files}`)
	lines.push(`Total Lines,${data.total_lines}`)
	lines.push(`Total Code,${data.total_code}`)
	lines.push(`Total Comments,${data.total_comments}`)
	lines.push(`Total Blank,${data.total_blank}`)
	lines.push(`Code Percentage,${data.code_percentage.toFixed(2)}%`)
	lines.push(`Comment Percentage,${data.comment_percentage.toFixed(2)}%`)
	lines.push('')

	// Languages
	lines.push('Language,Files,Code,Comments,Blank,Total')
	Object.entries(data.languages).forEach(([lang, stats]) => {
		lines.push(
			`${lang},${stats.files},${stats.code},${stats.comment},${stats.blank},${stats.total}`
		)
	})

	return lines.join('\n')
}

/**
 * Export scan results to Markdown
 */
export function exportToMarkdown(data: ScanResult, projectName?: string): string {
	const lines: string[] = []

	// Header
	lines.push(`# Code Analysis Report${projectName ? ` - ${projectName}` : ''}`)
	lines.push('')
	lines.push(`Generated: ${new Date().toLocaleString()}`)
	lines.push('')

	// Summary
	lines.push('## Summary')
	lines.push('')
	lines.push(`- **Total Files**: ${data.total_files.toLocaleString()}`)
	lines.push(`- **Total Lines**: ${data.total_lines.toLocaleString()}`)
	lines.push(
		`- **Code Lines**: ${data.total_code.toLocaleString()} (${data.code_percentage.toFixed(1)}%)`
	)
	lines.push(
		`- **Comments**: ${data.total_comments.toLocaleString()} (${data.comment_percentage.toFixed(1)}%)`
	)
	lines.push(`- **Blank Lines**: ${data.total_blank.toLocaleString()}`)
	lines.push(`- **Scan Duration**: ${(data.duration_ms / 1000).toFixed(2)}s`)
	lines.push('')

	// Languages table
	lines.push('## Languages')
	lines.push('')
	lines.push('| Language | Files | Code | Comments | Blank | Total |')
	lines.push('|----------|-------|------|----------|-------|-------|')

	Object.entries(data.languages)
		.sort((a, b) => b[1].code - a[1].code)
		.forEach(([lang, stats]) => {
			lines.push(
				`| ${lang} | ${stats.files} | ${stats.code.toLocaleString()} | ${stats.comment.toLocaleString()} | ${stats.blank.toLocaleString()} | ${stats.total.toLocaleString()} |`
			)
		})

	lines.push('')

	return lines.join('\n')
}

/**
 * Export scan results to HTML
 */
export function exportToHTML(data: ScanResult, projectName?: string): string {
	const title = projectName ? `${projectName} - Code Analysis` : 'Code Analysis Report'

	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f9fafb;
        }
        h1 { color: #111827; }
        h2 { color: #374151; margin-top: 2rem; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
        }
        .card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .card h3 {
            margin: 0 0 0.5rem 0;
            font-size: 0.875rem;
            color: #6b7280;
            font-weight: 500;
        }
        .card .value {
            font-size: 2rem;
            font-weight: bold;
            color: #111827;
        }
        table {
            width: 100%;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td {
            padding: 0.75rem 1rem;
            text-align: left;
        }
        th {
            background: #f3f4f6;
            font-weight: 600;
            color: #374151;
        }
        tr:not(:last-child) td {
            border-bottom: 1px solid #e5e7eb;
        }
        .footer {
            margin-top: 2rem;
            text-align: center;
            color: #6b7280;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>

    <h2>Summary</h2>
    <div class="summary">
        <div class="card">
            <h3>Total Files</h3>
            <div class="value">${data.total_files.toLocaleString()}</div>
        </div>
        <div class="card">
            <h3>Total Lines</h3>
            <div class="value">${data.total_lines.toLocaleString()}</div>
        </div>
        <div class="card">
            <h3>Code Lines</h3>
            <div class="value">${data.total_code.toLocaleString()}</div>
            <small>${data.code_percentage.toFixed(1)}%</small>
        </div>
        <div class="card">
            <h3>Comments</h3>
            <div class="value">${data.total_comments.toLocaleString()}</div>
            <small>${data.comment_percentage.toFixed(1)}%</small>
        </div>
        <div class="card">
            <h3>Blank Lines</h3>
            <div class="value">${data.total_blank.toLocaleString()}</div>
        </div>
    </div>

    <h2>Languages</h2>
    <table>
        <thead>
            <tr>
                <th>Language</th>
                <th>Files</th>
                <th>Code</th>
                <th>Comments</th>
                <th>Blank</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(data.languages)
				.sort((a, b) => b[1].code - a[1].code)
				.map(
					([lang, stats]) => `
                <tr>
                    <td><strong>${lang}</strong></td>
                    <td>${stats.files}</td>
                    <td>${stats.code.toLocaleString()}</td>
                    <td>${stats.comment.toLocaleString()}</td>
                    <td>${stats.blank.toLocaleString()}</td>
                    <td><strong>${stats.total.toLocaleString()}</strong></td>
                </tr>
            `
				)
				.join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>Generated by CodePulse</p>
    </div>
</body>
</html>`
}

/**
 * Export Git commit history to Markdown
 */
export function exportCommitsToMarkdown(commits: GitCommitInfo[], repoInfo?: GitRepoInfo): string {
	const lines: string[] = []

	lines.push('# Git Commit History')
	lines.push('')

	if (repoInfo) {
		lines.push(`**Repository**: ${repoInfo.path}`)
		lines.push(`**Branch**: ${repoInfo.current_branch}`)
		if (repoInfo.remote_url) {
			lines.push(`**Remote**: ${repoInfo.remote_url}`)
		}
		lines.push('')
	}

	lines.push(`Generated: ${new Date().toLocaleString()}`)
	lines.push('')
	lines.push(`Total Commits: ${commits.length}`)
	lines.push('')

	// Commits table
	lines.push('## Commits')
	lines.push('')
	lines.push('| SHA | Author | Date | Message |')
	lines.push('|-----|--------|------|---------|')

	commits.forEach(commit => {
		const shortSha = commit.sha.substring(0, 7)
		const date = new Date(commit.timestamp * 1000).toLocaleDateString()
		const message = commit.message.split('\n')[0].replace(/\|/g, '\\|')
		lines.push(`| \`${shortSha}\` | ${commit.author_name} | ${date} | ${message} |`)
	})

	lines.push('')

	return lines.join('\n')
}

/**
 * Save content to file using Tauri dialog
 */
export async function saveToFile(
	content: string,
	defaultName: string,
	format: ExportFormat
): Promise<boolean> {
	try {
		const { save } = await import('@tauri-apps/api/dialog')
		const { writeTextFile } = await import('@tauri-apps/api/fs')

		const extensions: Record<ExportFormat, string> = {
			json: 'json',
			csv: 'csv',
			markdown: 'md',
			html: 'html'
		}

		const filePath = await save({
			defaultPath: `${defaultName}.${extensions[format]}`,
			filters: [
				{
					name: format.toUpperCase(),
					extensions: [extensions[format]]
				}
			]
		})

		if (filePath) {
			await writeTextFile(filePath, content)
			return true
		}

		return false
	} catch (error) {
		console.error('Failed to save file:', error)
		return false
	}
}
