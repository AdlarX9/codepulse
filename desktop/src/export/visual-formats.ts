import { makeBarChartSvg, makeDonutChartSvg, makeLineChartSvg, svgToDataUri } from './charts'
import { ExportBundle } from './models'

function formatInt(value: number): string {
	return new Intl.NumberFormat('en-US').format(Math.round(value))
}

function formatDecimal(value: number): string {
	return value.toFixed(1)
}

function formatPercent(value: number): string {
	return `${value.toFixed(1)}%`
}

function mdTable(headers: string[], rows: string[][]): string {
	const out: string[] = []
	out.push(`| ${headers.join(' | ')} |`)
	out.push(`| ${headers.map(() => '---').join(' | ')} |`)
	for (const row of rows) {
		out.push(`| ${row.join(' | ')} |`)
	}
	return out.join('\n')
}

function htmlOverviewSection(bundle: ExportBundle): string {
	const o = bundle.visual.overview
	const languageDonutSvg = makeDonutChartSvg(
		o.codeLanguageData.map(item => ({ label: item.name, value: item.value })),
		{ title: 'Code Languages Distribution' }
	)
	const distributionBarsSvg = makeBarChartSvg(
		o.codeDistributionData.map(item => ({
			label: item.name,
			value: item.value,
			color: item.color
		})),
		{ title: 'Code Line Distribution' }
	)
	const codeLanguageTotal = Math.max(
		1,
		o.codeLanguageData.reduce((acc, item) => acc + item.value, 0)
	)

	return `<section><h2>Overview</h2>
<div class="cards">
<div class="card"><h4>Total Files</h4><p>${formatInt(o.topMetrics.totalFiles)}</p></div>
<div class="card"><h4>Total Lines</h4><p>${formatInt(o.topMetrics.totalLines)}</p></div>
<div class="card"><h4>Total Code</h4><p>${formatInt(o.topMetrics.totalCode)}</p></div>
<div class="card"><h4>Main Language</h4><p>${o.topMetrics.mainLanguage}</p></div>
</div>
<h3>Global Statistics</h3>
<table><thead><tr><th>Scope</th><th>Total Files</th><th>Total Lines</th><th>Mean</th><th>Median</th><th>Std dev</th></tr></thead><tbody>
${o.summaryRows
	.map(
		r =>
			`<tr><td>${r.label}</td><td>${formatInt(r.totalFiles)}</td><td>${formatInt(
				r.totalLines
			)}</td><td>${formatDecimal(r.mean)}</td><td>${formatDecimal(r.median)}</td><td>${formatDecimal(
				r.stdDeviation
			)}</td></tr>`
	)
	.join('')}
</tbody></table>
<div class="chart-grid">
<div class="chart-card">${languageDonutSvg}</div>
<div class="chart-card">${distributionBarsSvg}</div>
</div>
<h3>Code Language Distribution</h3>
<table><thead><tr><th>Language</th><th>Files</th><th>Code Lines</th><th>Share</th></tr></thead><tbody>
${o.codeLanguageData
	.map(
		r =>
			`<tr><td>${r.name}</td><td>${formatInt(r.files)}</td><td>${formatInt(r.value)}</td><td>${formatPercent(
				(r.value / codeLanguageTotal) * 100
			)}</td></tr>`
	)
	.join('')}
</tbody></table>
<h3>Code Line Distribution</h3>
<table><thead><tr><th>Segment</th><th>Lines</th><th>Share</th><th>Color</th></tr></thead><tbody>
${o.codeDistributionData
	.map(
		r =>
			`<tr><td>${r.name}</td><td>${formatInt(r.value)}</td><td>${formatPercent(
				r.percentage
			)}</td><td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;background:${r.color}"></span>${r.color}</td></tr>`
	)
	.join('')}
</tbody></table>
<h3>Languages Breakdown</h3>
<table><thead><tr><th>Language</th><th>Files</th><th>Total</th><th>Code</th><th>Comments</th><th>Blank</th></tr></thead><tbody>
${o.languageBreakdownData
	.map(
		r =>
			`<tr><td>${r.name}</td><td>${formatInt(r.stats.files)}</td><td>${formatInt(
				r.stats.total
			)}</td><td>${formatInt(r.stats.code)}</td><td>${formatInt(r.stats.comment)}</td><td>${formatInt(
				r.stats.blank
			)}</td></tr>`
	)
	.join('')}
</tbody></table>
</section>`
}

function htmlEvolutionSection(bundle: ExportBundle): string {
	const e = bundle.visual.evolution
	const locLineSvg = makeLineChartSvg(
		e.locPoints.map(point => ({ label: point.label, value: point.totalLoc })),
		{ title: 'Lines of Code Evolution' }
	)
	const weeklyBarSvg = makeBarChartSvg(
		e.weeklyChanges.map(point => ({
			label: point.week,
			value: point.additions - point.deletions,
			color: point.additions - point.deletions >= 0 ? '#10B981' : '#EF4444'
		})),
		{ title: 'Weekly Additions/Deletions (net)' }
	)

	return `<section><h2>Evolution</h2>
<div class="cards">
<div class="card"><h4>Snapshots</h4><p>${formatInt(e.generalStats.snapshots)}</p></div>
<div class="card"><h4>Active weeks / days</h4><p>${formatInt(
		e.generalStats.activeWeeks
	)} / ${formatInt(e.generalStats.activeDays)}</p></div>
<div class="card"><h4>Age (days)</h4><p>${formatInt(e.generalStats.ageDays)}</p></div>
<div class="card"><h4>Cumulated +/-</h4><p>+${formatInt(
		e.generalStats.cumulatedAdditions
	)} / -${formatInt(e.generalStats.cumulatedDeletions)}</p></div>
<div class="card"><h4>Peak LOC</h4><p>${formatInt(e.allTimeStats.peakLoc)}</p></div>
<div class="card"><h4>Biggest Bump</h4><p>${formatInt(e.allTimeStats.biggestBump)}</p></div>
<div class="card"><h4>Longest Streak</h4><p>${formatInt(e.allTimeStats.longestStreakDays)}</p></div>
<div class="card"><h4>Longest Inactivity</h4><p>${formatInt(
		e.allTimeStats.longestInactivityDays
	)}</p></div>
</div>
<div class="chart-grid"><div class="chart-card">${locLineSvg}</div><div class="chart-card">${weeklyBarSvg}</div></div>
</section>`
}

function htmlContributorsSection(bundle: ExportBundle): string {
	const c = bundle.visual.contributors
	const pieSvg = makeDonutChartSvg(
		c.pieSlices.map(slice => ({
			label: `${slice.label} (${slice.percentage.toFixed(1)}%)`,
			value: slice.lines,
			color: slice.color
		})),
		{ title: 'Contributor LOC Share' }
	)

	return `<section><h2>Contributors</h2>
${
	c.mainContributor
		? `<div class="banner"><h3>Main Contributor: ${c.mainContributor.pseudo}</h3><p>Name: ${c.mainContributor.name} | Email: ${
				c.mainContributor.email || 'N/A'
			} | Commits: ${formatInt(c.mainContributor.commits)} (${formatDecimal(
				c.mainContributor.commit_percentage
			)}%) | Lines: ${formatInt(c.mainContributor.lines)} (${formatDecimal(
				c.mainContributor.line_percentage
			)}%)</p></div>`
		: '<div class="banner"><h3>Main Contributor: N/A</h3></div>'
}
<div class="chart-grid"><div class="chart-card">${pieSvg}</div></div>
<table><thead><tr><th>Contributor</th><th>Commits</th><th>Lines</th><th>Lines/commit</th></tr></thead><tbody>
${c.contributors
	.map(
		r =>
			`<tr><td>${r.pseudo}</td><td>${formatInt(r.commits)}</td><td>${formatInt(
				r.lines
			)}</td><td>${formatDecimal(r.lines_per_commit)}</td></tr>`
	)
	.join('')}
</tbody></table>
</section>`
}

export function buildVisualHtml(bundle: ExportBundle): string {
	return `<!doctype html><html><head><meta charset="utf-8" /><title>${bundle.projectName} report</title>
<style>
:root{--bgA:#eef5ff;--bgB:#ecfeff;--surface:#ffffff;--border:#dbe6f3;--title:#0b2042;--muted:#4b658d;--primary:#2563eb;--secondary:#0ea5e9;--accent:#14b8a6}
*{box-sizing:border-box}
body{font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,"Inter",Roboto,"Helvetica Neue",Arial,sans-serif;color:#0f172a;padding:28px;line-height:1.6;max-width:1200px;margin:0 auto;font-size:16px;background:radial-gradient(circle at 0% 0%,rgba(37,99,235,.14),transparent 35%),radial-gradient(circle at 100% 0%,rgba(14,165,233,.12),transparent 35%),linear-gradient(180deg,var(--bgA),var(--bgB))}
h1{font-size:36px;margin:0 0 10px 0;color:var(--title);font-weight:700}
h2{font-size:26px;margin:20px 0 16px 0;color:var(--title);font-weight:600;page-break-after:avoid}
h3{font-size:18px;margin:16px 0 10px 0;color:#1f3a67;font-weight:600;page-break-after:avoid}
h4{font-size:13px;margin:0 0 6px 0;color:var(--muted);letter-spacing:.7px;text-transform:uppercase;font-weight:600}
section{margin:24px 0;padding:24px;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.06);page-break-inside:avoid}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:14px 0 16px 0}
.card{background:linear-gradient(180deg,#ffffff 0%,#f5faff 100%);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;page-break-inside:avoid}
.card:nth-child(4n+1){border-top:3px solid var(--primary)}
.card:nth-child(4n+2){border-top:3px solid var(--secondary)}
.card:nth-child(4n+3){border-top:3px solid var(--accent)}
.card:nth-child(4n+4){border-top:3px solid #f59e0b}
.card h4{margin:0 0 6px 0}
.card p{margin:0;font-size:24px;font-weight:700;color:#0f172a}
.banner{background:linear-gradient(135deg,#eff6ff 0%,#ecfeff 100%);border:1px solid #bfdbfe;border-left:4px solid var(--primary);border-radius:10px;padding:14px;margin-bottom:14px;page-break-inside:avoid}
.banner h3{margin:0 0 6px 0;color:#1e3a8a;font-size:16px}
.banner p{margin:0;font-size:14px;color:#1e3a8a}
.chart-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px;margin:16px 0}
.chart-card{background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border:1px solid var(--border);border-radius:10px;padding:12px;page-break-inside:avoid}
.chart-card svg{display:block;max-width:100%;height:auto}
table{width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;page-break-inside:avoid}
th,td{border-bottom:1px solid var(--border);padding:10px 12px;text-align:left}
th{background:#eff6ff;font-weight:700;color:#1e3a8a;font-size:14px;page-break-inside:avoid}
tbody tr{page-break-inside:auto}
tbody tr:nth-child(even){background:#fbfdff}
tbody td{page-break-inside:avoid}
.small{color:#64748b;font-size:13px;margin:10px 0}
@media print{body{padding:0;background:#fff;font-size:16px}section,.chart-card,.card,.banner,table{page-break-inside:avoid}h2,h3{page-break-after:avoid}}
</style></head><body>
<h1>${bundle.projectName} - Export Report</h1>
<p class="small">Generated at ${bundle.generatedAtIso}</p>
${htmlOverviewSection(bundle)}
${htmlEvolutionSection(bundle)}
${htmlContributorsSection(bundle)}
</body></html>`
}

export function buildVisualMarkdown(bundle: ExportBundle): string {
	const o = bundle.visual.overview
	const e = bundle.visual.evolution
	const c = bundle.visual.contributors
	const codeLanguageTotal = Math.max(
		1,
		o.codeLanguageData.reduce((acc, item) => acc + item.value, 0)
	)
	const codeLangSvg = makeDonutChartSvg(
		o.codeLanguageData.map(item => ({ label: item.name, value: item.value })),
		{ title: 'Code Languages Distribution' }
	)
	const codeDistSvg = makeBarChartSvg(
		o.codeDistributionData.map(item => ({
			label: item.name,
			value: item.value,
			color: item.color
		})),
		{ title: 'Code Line Distribution' }
	)
	const locSvg = makeLineChartSvg(
		e.locPoints.map(point => ({ label: point.label, value: point.totalLoc })),
		{ title: 'Lines of Code Evolution' }
	)
	const weeklySvg = makeBarChartSvg(
		e.weeklyChanges.map(point => ({
			label: point.week,
			value: point.additions - point.deletions,
			color: point.additions - point.deletions >= 0 ? '#10B981' : '#EF4444'
		})),
		{ title: 'Weekly Additions/Deletions (net)' }
	)
	const contribSvg = makeDonutChartSvg(
		c.pieSlices.map(slice => ({ label: slice.label, value: slice.lines, color: slice.color })),
		{ title: 'Contributor LOC Share' }
	)

	const md: string[] = []
	md.push(`# ${bundle.projectName} - Visual Export`)
	md.push('')
	md.push(`Generated at: ${bundle.generatedAtIso}`)
	md.push('')
	md.push('## Overview')
	md.push('')
	md.push(
		mdTable(
			['Metric', 'Value'],
			[
				['Total files', formatInt(o.topMetrics.totalFiles)],
				['Total lines', formatInt(o.topMetrics.totalLines)],
				['Total code', formatInt(o.topMetrics.totalCode)],
				['Main language', o.topMetrics.mainLanguage]
			]
		)
	)
	md.push('')
	md.push('### Global Statistics')
	md.push('')
	md.push(
		mdTable(
			['Scope', 'Total files', 'Total lines', 'Mean', 'Median', 'Std dev'],
			o.summaryRows.map(row => [
				row.label,
				formatInt(row.totalFiles),
				formatInt(row.totalLines),
				formatDecimal(row.mean),
				formatDecimal(row.median),
				formatDecimal(row.stdDeviation)
			])
		)
	)
	md.push('')
	md.push('### Code Language Distribution')
	md.push('')
	md.push(
		mdTable(
			['Language', 'Files', 'Code lines', 'Share'],
			o.codeLanguageData.map(row => [
				row.name,
				formatInt(row.files),
				formatInt(row.value),
				formatPercent((row.value / codeLanguageTotal) * 100)
			])
		)
	)
	md.push('')
	md.push('### Code Line Distribution')
	md.push('')
	md.push(
		mdTable(
			['Segment', 'Lines', 'Share', 'Color'],
			o.codeDistributionData.map(row => [
				row.name,
				formatInt(row.value),
				formatPercent(row.percentage),
				row.color
			])
		)
	)
	md.push('')
	md.push('### Language Breakdown')
	md.push('')
	md.push(
		mdTable(
			['Language', 'Files', 'Total', 'Code', 'Comments', 'Blank'],
			o.languageBreakdownData.map(row => [
				row.name,
				formatInt(row.stats.files),
				formatInt(row.stats.total),
				formatInt(row.stats.code),
				formatInt(row.stats.comment),
				formatInt(row.stats.blank)
			])
		)
	)
	md.push('')
	md.push('### Overview Charts')
	md.push('')
	md.push(`![Code Languages Distribution](${svgToDataUri(codeLangSvg)})`)
	md.push('')
	md.push(`![Code Line Distribution](${svgToDataUri(codeDistSvg)})`)
	md.push('')
	md.push('## Evolution')
	md.push('')
	md.push(
		mdTable(
			['Metric', 'Value'],
			[
				['Snapshots', formatInt(e.generalStats.snapshots)],
				['Active weeks', formatInt(e.generalStats.activeWeeks)],
				['Active days', formatInt(e.generalStats.activeDays)],
				['Age (days)', formatInt(e.generalStats.ageDays)],
				['Cumulated additions', formatInt(e.generalStats.cumulatedAdditions)],
				['Cumulated deletions', formatInt(e.generalStats.cumulatedDeletions)],
				['Peak LOC', formatInt(e.allTimeStats.peakLoc)],
				['Biggest bump', formatInt(e.allTimeStats.biggestBump)],
				['Longest streak (days)', formatInt(e.allTimeStats.longestStreakDays)],
				['Longest inactivity (days)', formatInt(e.allTimeStats.longestInactivityDays)]
			]
		)
	)
	md.push('')
	md.push('### Weekly Changes')
	md.push('')
	md.push(
		mdTable(
			['Week', 'Additions', 'Deletions', 'Net'],
			e.weeklyChanges.map(row => [
				row.week,
				formatInt(row.additions),
				formatInt(row.deletions),
				formatInt(row.additions - row.deletions)
			])
		)
	)
	md.push('')
	md.push('### Daily Changes (last 30 points)')
	md.push('')
	md.push(
		mdTable(
			['Date', 'Additions', 'Deletions'],
			e.dailyChanges
				.slice(-30)
				.map(row => [row.date, formatInt(row.additions), formatInt(row.deletions)])
		)
	)
	md.push('')
	md.push('### Lines of Code Evolution (chart)')
	md.push('')
	md.push(`![LOC Evolution](${svgToDataUri(locSvg)})`)
	md.push('')
	md.push('### Weekly Net Changes (chart)')
	md.push('')
	md.push(`![Weekly Net Changes](${svgToDataUri(weeklySvg)})`)
	md.push('')
	md.push('## Contributors')
	md.push('')
	md.push(
		mdTable(
			['Metric', 'Value'],
			[
				['Total commits', formatInt(c.totalCommits)],
				['Total lines', formatInt(c.totalLines)],
				['Contributors', formatInt(c.contributors.length)]
			]
		)
	)
	md.push('')
	if (c.mainContributor) {
		md.push('### Main Contributor')
		md.push('')
		md.push(
			mdTable(
				['Pseudo', 'Name', 'Email', 'Commits', 'Commit %', 'Lines', 'Line %'],
				[
					[
						c.mainContributor.pseudo,
						c.mainContributor.name,
						c.mainContributor.email || 'N/A',
						formatInt(c.mainContributor.commits),
						formatPercent(c.mainContributor.commit_percentage),
						formatInt(c.mainContributor.lines),
						formatPercent(c.mainContributor.line_percentage)
					]
				]
			)
		)
		md.push('')
	}
	md.push('')
	md.push('### LOC Share (chart)')
	md.push('')
	md.push(`![Contributors LOC](${svgToDataUri(contribSvg)})`)
	md.push('')
	md.push(
		mdTable(
			[
				'Contributor',
				'Commits',
				'Commit %',
				'Lines',
				'Line %',
				'Lines/commit',
				'First commit',
				'Last commit'
			],
			c.contributors.map(row => [
				row.pseudo,
				formatInt(row.commits),
				formatPercent(row.commit_percentage),
				formatInt(row.lines),
				formatPercent(row.line_percentage),
				formatDecimal(row.lines_per_commit),
				row.first_commit_date,
				row.last_commit_date
			])
		)
	)

	return md.join('\n')
}

function latexEscape(input: string): string {
	return input
		.replace(/\\/g, '\\textbackslash{}')
		.replace(/_/g, '\\_')
		.replace(/%/g, '\\%')
		.replace(/&/g, '\\&')
		.replace(/#/g, '\\#')
		.replace(/\$/g, '\\$')
		.replace(/{/g, '\\{')
		.replace(/}/g, '\\}')
}

function latexTable(headers: string[], rows: string[][], columnSpec: string): string {
	const escapedHeaders = headers.map(latexEscape).join(' & ')
	const body =
		rows.length > 0
			? rows.map(row => `${row.map(cell => latexEscape(cell)).join(' & ')} \\\\`).join('\n')
			: `\\multicolumn{${headers.length}}{c}{No data} \\\\`

	return `\\begin{longtable}{${columnSpec}}
\\toprule
${escapedHeaders} \\\\
\\midrule
\\endfirsthead
\\toprule
${escapedHeaders} \\\\
\\midrule
\\endhead
${body}
\\bottomrule
\\end{longtable}`
}

export function buildVisualLatex(bundle: ExportBundle): string {
	const o = bundle.visual.overview
	const e = bundle.visual.evolution
	const c = bundle.visual.contributors
	const codeLanguageTotal = Math.max(
		1,
		o.codeLanguageData.reduce((acc, item) => acc + item.value, 0)
	)
	const coords =
		e.locPoints.length > 0
			? e.locPoints.map((p, i) => `(${i + 1},${Math.round(p.totalLoc)})`).join(' ')
			: '(0,0)'
	const weeklyCoords =
		e.weeklyChanges.length > 0
			? e.weeklyChanges
					.map((row, i) => `(${i + 1},${Math.round(row.additions - row.deletions)})`)
					.join(' ')
			: '(0,0)'
	const contribCoords = c.contributors
		.slice(0, 10)
		.map((row, i) => `(${i + 1},${Math.round(row.lines)})`)
		.join(' ')

	const latex: string[] = []
	latex.push('\\documentclass{article}')
	latex.push('\\usepackage[T1]{fontenc}')
	latex.push('\\usepackage[utf8]{inputenc}')
	latex.push('\\usepackage[margin=1in]{geometry}')
	latex.push('\\usepackage{booktabs}')
	latex.push('\\usepackage{longtable}')
	latex.push('\\usepackage{pgfplots}')
	latex.push('\\pgfplotsset{compat=1.18}')
	latex.push('\\begin{document}')
	latex.push(`\\section*{${latexEscape(bundle.projectName)} - Visual Export}`)
	latex.push(`Generated at: ${latexEscape(bundle.generatedAtIso)}`)
	latex.push('')

	latex.push('\\subsection*{Overview}')
	latex.push('\\begin{itemize}')
	latex.push(`\\item Total files: ${o.topMetrics.totalFiles}`)
	latex.push(`\\item Total lines: ${o.topMetrics.totalLines}`)
	latex.push(`\\item Total code: ${o.topMetrics.totalCode}`)
	latex.push(`\\item Main language: ${latexEscape(o.topMetrics.mainLanguage)}`)
	latex.push('\\end{itemize}')
	latex.push('')

	latex.push('\\subsubsection*{Global Statistics}')
	latex.push(
		latexTable(
			['Scope', 'Total files', 'Total lines', 'Mean', 'Median', 'Std dev'],
			o.summaryRows.map(row => [
				row.label,
				String(Math.round(row.totalFiles)),
				String(Math.round(row.totalLines)),
				formatDecimal(row.mean),
				formatDecimal(row.median),
				formatDecimal(row.stdDeviation)
			]),
			'lrrrrr'
		)
	)
	latex.push('')

	latex.push('\\subsubsection*{Code Language Distribution}')
	latex.push(
		latexTable(
			['Language', 'Files', 'Code lines', 'Share'],
			o.codeLanguageData.map(row => [
				row.name,
				String(Math.round(row.files)),
				String(Math.round(row.value)),
				formatPercent((row.value / codeLanguageTotal) * 100)
			]),
			'lrrr'
		)
	)
	latex.push('')

	latex.push('\\subsubsection*{Code Line Distribution}')
	latex.push(
		latexTable(
			['Segment', 'Lines', 'Share', 'Color'],
			o.codeDistributionData.map(row => [
				row.name,
				String(Math.round(row.value)),
				formatPercent(row.percentage),
				row.color
			]),
			'lrrl'
		)
	)
	latex.push('')

	latex.push('\\subsubsection*{Language Breakdown}')
	latex.push(
		latexTable(
			['Language', 'Files', 'Total', 'Code', 'Comments', 'Blank'],
			o.languageBreakdownData.map(row => [
				row.name,
				String(Math.round(row.stats.files)),
				String(Math.round(row.stats.total)),
				String(Math.round(row.stats.code)),
				String(Math.round(row.stats.comment)),
				String(Math.round(row.stats.blank))
			]),
			'lrrrrr'
		)
	)
	latex.push('')

	latex.push('\\subsection*{Evolution}')
	latex.push(
		latexTable(
			['Metric', 'Value'],
			[
				['Snapshots', String(Math.round(e.generalStats.snapshots))],
				['Active weeks', String(Math.round(e.generalStats.activeWeeks))],
				['Active days', String(Math.round(e.generalStats.activeDays))],
				['Age (days)', String(Math.round(e.generalStats.ageDays))],
				['Cumulated additions', String(Math.round(e.generalStats.cumulatedAdditions))],
				['Cumulated deletions', String(Math.round(e.generalStats.cumulatedDeletions))],
				['Peak LOC', String(Math.round(e.allTimeStats.peakLoc))],
				['Biggest bump', String(Math.round(e.allTimeStats.biggestBump))],
				['Longest streak (days)', String(Math.round(e.allTimeStats.longestStreakDays))],
				[
					'Longest inactivity (days)',
					String(Math.round(e.allTimeStats.longestInactivityDays))
				]
			],
			'lr'
		)
	)
	latex.push('')

	latex.push('\\subsubsection*{Weekly Changes}')
	latex.push(
		latexTable(
			['Week', 'Additions', 'Deletions', 'Net'],
			e.weeklyChanges.map(row => [
				row.week,
				String(Math.round(row.additions)),
				String(Math.round(row.deletions)),
				String(Math.round(row.additions - row.deletions))
			]),
			'lrrr'
		)
	)
	latex.push('')

	latex.push('\\subsubsection*{Daily Changes (last 30 points)}')
	latex.push(
		latexTable(
			['Date', 'Additions', 'Deletions'],
			e.dailyChanges
				.slice(-30)
				.map(row => [
					row.date,
					String(Math.round(row.additions)),
					String(Math.round(row.deletions))
				]),
			'lrr'
		)
	)
	latex.push('')

	latex.push('\\subsubsection*{Evolution Charts}')
	latex.push('\\begin{tikzpicture}')
	latex.push(
		'\\begin{axis}[width=\\linewidth,height=6cm,title={Lines of Code Evolution},xlabel={Snapshot},ylabel={LOC}]'
	)
	latex.push(`\\addplot[color=blue,mark=*] coordinates {${coords}};`)
	latex.push('\\end{axis}')
	latex.push('\\end{tikzpicture}')
	latex.push('')
	latex.push('\\begin{tikzpicture}')
	latex.push(
		'\\begin{axis}[width=\\linewidth,height=6cm,title={Weekly Net Changes},xlabel={Week rank},ylabel={Net lines}]'
	)
	latex.push(`\\addplot[ybar,fill=teal] coordinates {${weeklyCoords}};`)
	latex.push('\\end{axis}')
	latex.push('\\end{tikzpicture}')
	latex.push('')

	latex.push('\\subsection*{Contributors}')
	latex.push(
		latexTable(
			['Metric', 'Value'],
			[
				['Total commits', String(Math.round(c.totalCommits))],
				['Total lines', String(Math.round(c.totalLines))],
				['Contributors', String(Math.round(c.contributors.length))]
			],
			'lr'
		)
	)
	latex.push('')

	if (c.mainContributor) {
		latex.push('\\subsubsection*{Main Contributor}')
		latex.push(
			latexTable(
				['Pseudo', 'Name', 'Email', 'Commits', 'Commit %', 'Lines', 'Line %'],
				[
					[
						c.mainContributor.pseudo,
						c.mainContributor.name,
						c.mainContributor.email || 'N/A',
						String(Math.round(c.mainContributor.commits)),
						formatPercent(c.mainContributor.commit_percentage),
						String(Math.round(c.mainContributor.lines)),
						formatPercent(c.mainContributor.line_percentage)
					]
				],
				'lllrrrr'
			)
		)
		latex.push('')
	}

	latex.push('\\subsubsection*{Contributors Table}')
	latex.push(
		latexTable(
			[
				'Contributor',
				'Commits',
				'Commit %',
				'Lines',
				'Line %',
				'Lines/commit',
				'First commit',
				'Last commit'
			],
			c.contributors.map(row => [
				row.pseudo,
				String(Math.round(row.commits)),
				formatPercent(row.commit_percentage),
				String(Math.round(row.lines)),
				formatPercent(row.line_percentage),
				formatDecimal(row.lines_per_commit),
				row.first_commit_date,
				row.last_commit_date
			]),
			'lrrrrlll'
		)
	)
	latex.push('')
	latex.push('\\begin{tikzpicture}')
	latex.push(
		'\\begin{axis}[width=\\linewidth,height=6cm,title={Contributor LOC Share (Top 10)},xlabel={Contributor Rank},ylabel={Lines}]'
	)
	latex.push(`\\addplot[ybar,fill=teal] coordinates {${contribCoords || '(0,0)'}};`)
	latex.push('\\end{axis}')
	latex.push('\\end{tikzpicture}')
	latex.push('\\end{document}')

	return latex.join('\n')
}
