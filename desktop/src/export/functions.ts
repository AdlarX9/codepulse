import { collectExportBundle } from './data'
import { buildRawCsv, buildRawJson, buildRawSql, buildRawXml } from './raw-formats'
import { buildVisualHtml, buildVisualLatex, buildVisualMarkdown } from './visual-formats'
import { savePdfFromHtml, saveTextArtifact } from './save'
import type { ExportFormat, ScanResult } from '@/types'

export type RunExportInput = {
	format: ExportFormat
	scanResult: ScanResult
	projectName: string
	projectPath: string
	hasGit: boolean
}

export async function runExport(input: RunExportInput): Promise<boolean> {
	const { format, scanResult, projectName, projectPath, hasGit } = input
	const bundle = await collectExportBundle({
		scanResult,
		projectName,
		projectPath,
		hasGit
	})

	const baseName = (projectName || 'code-analysis').trim() || 'code-analysis'

	switch (format) {
		case 'raw-json': {
			const content = buildRawJson(bundle)
			return saveTextArtifact(content, baseName, 'json', 'JSON')
		}
		case 'raw-csv': {
			const content = buildRawCsv(bundle)
			return saveTextArtifact(content, baseName, 'csv', 'CSV')
		}
		case 'raw-sql': {
			const content = buildRawSql(bundle)
			return saveTextArtifact(content, baseName, 'sql', 'SQL')
		}
		case 'raw-xml': {
			const content = buildRawXml(bundle)
			return saveTextArtifact(content, baseName, 'xml', 'XML')
		}
		case 'visual-html': {
			const content = buildVisualHtml(bundle)
			return saveTextArtifact(content, baseName, 'html', 'HTML')
		}
		case 'visual-markdown': {
			const content = buildVisualMarkdown(bundle)
			return saveTextArtifact(content, baseName, 'md', 'Markdown')
		}
		case 'visual-latex': {
			const content = buildVisualLatex(bundle)
			return saveTextArtifact(content, baseName, 'tex', 'LaTeX')
		}
		case 'visual-pdf': {
			const html = buildVisualHtml(bundle)
			return savePdfFromHtml(html, baseName)
		}
		default:
			return false
	}
}
