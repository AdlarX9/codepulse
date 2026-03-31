import { makeBarChartSvg, makeDonutChartSvg, makeLineChartSvg, svgToDataUri } from './charts'
import { ExportBundle } from './models'

function formatInt(value: number): string {
	return new Intl.NumberFormat('en-US').format(Math.round(value))
}

function formatDecimal(value: number): string {
	return value.toFixed(1)
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
body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;padding:20px;line-height:1.5;max-width:1200px;margin:0 auto}
h1{font-size:28px;margin:0 0 8px 0}
h2{font-size:18px;margin:20px 0 10px 0}
h3{font-size:14px;margin:12px 0 8px 0}
h4{font-size:12px;margin:0 0 4px 0;color:#475569}
section{margin:20px 0;padding:16px;background:#fff;border:1px solid #e2e8f0;border-radius:10px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:10px 0}
.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}
.card h4{margin:0 0 4px 0;font-size:11px;color:#64748b;text-transform:uppercase}
.card p{margin:0;font-size:18px;font-weight:700;color:#0f172a}
.banner{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;margin-bottom:12px}
.banner h3{margin:0 0 4px 0}
.banner p{margin:0;font-size:12px;color:#1e40af}
.chart-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(500px,1fr));gap:12px;margin:12px 0}
.chart-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px;page-break-inside:avoid}
.chart-card svg{display:block;max-width:100%;height:auto}
table{width:100%;border-collapse:collapse;font-size:12px;margin:8px 0}
th,td{border-bottom:1px solid #e2e8f0;padding:6px 8px;text-align:left}
th{background:#f8fafc;font-weight:600}
.small{color:#64748b;font-size:11px;margin:8px 0}
@media print{body{padding:10px}section{page-break-inside:avoid}}
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
	const locSvg = makeLineChartSvg(
		e.locPoints.map(point => ({ label: point.label, value: point.totalLoc })),
		{ title: 'Lines of Code Evolution' }
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
				['Peak LOC', formatInt(e.allTimeStats.peakLoc)],
				['Biggest bump', formatInt(e.allTimeStats.biggestBump)]
			]
		)
	)
	md.push('')
	md.push('### Lines of Code Evolution (chart)')
	md.push('')
	md.push(`![LOC Evolution](${svgToDataUri(locSvg)})`)
	md.push('')
	md.push('## Contributors')
	md.push('')
	if (c.mainContributor) {
		md.push(
			`Main contributor: **${c.mainContributor.pseudo}** (${formatInt(
				c.mainContributor.commits
			)} commits, ${formatInt(c.mainContributor.lines)} lines)`
		)
	}
	md.push('')
	md.push('### LOC Share (chart)')
	md.push('')
	md.push(`![Contributors LOC](${svgToDataUri(contribSvg)})`)
	md.push('')
	md.push(
		mdTable(
			['Contributor', 'Commits', 'Lines', 'Lines/commit'],
			c.contributors.map(row => [
				row.pseudo,
				formatInt(row.commits),
				formatInt(row.lines),
				formatDecimal(row.lines_per_commit)
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

export function buildVisualLatex(bundle: ExportBundle): string {
	const e = bundle.visual.evolution
	const c = bundle.visual.contributors
	const coords = e.locPoints.map((p, i) => `(${i + 1},${Math.round(p.totalLoc)})`).join(' ')
	const contribCoords = c.contributors
		.slice(0, 10)
		.map((row, i) => `(${i + 1},${Math.round(row.lines)})`)
		.join(' ')

	return `\\documentclass{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{booktabs}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\begin{document}
\\section*{${latexEscape(bundle.projectName)} - Visual Export}
Generated at: ${latexEscape(bundle.generatedAtIso)}

\\subsection*{Overview}
Total files: ${bundle.visual.overview.topMetrics.totalFiles}\\\\
Total lines: ${bundle.visual.overview.topMetrics.totalLines}\\\\
Total code: ${bundle.visual.overview.topMetrics.totalCode}\\\\
Main language: ${latexEscape(bundle.visual.overview.topMetrics.mainLanguage)}

\\subsection*{Evolution}
\\begin{tikzpicture}
\\begin{axis}[width=\\linewidth,height=6cm,title={Lines of Code Evolution},xlabel={Snapshot},ylabel={LOC}]
\\addplot[color=blue,mark=*] coordinates {${coords}};
\\end{axis}
\\end{tikzpicture}

\\subsection*{Contributors}
\\begin{tabular}{lrrr}
\\toprule
Contributor & Commits & Lines & Lines/commit \\\\
\\midrule
${c.contributors
	.map(
		r =>
			`${latexEscape(r.pseudo)} & ${r.commits} & ${r.lines} & ${r.lines_per_commit.toFixed(
				1
			)} \\\\`
	)
	.join('\n')}
\\bottomrule
\\end{tabular}

\\begin{tikzpicture}
\\begin{axis}[width=\\linewidth,height=6cm,title={Contributor LOC Share (Top 10)},xlabel={Contributor Rank},ylabel={Lines}]
\\addplot[ybar,fill=teal] coordinates {${contribCoords}};
\\end{axis}
\\end{tikzpicture}
\\end{document}`
}
