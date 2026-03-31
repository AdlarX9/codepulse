import { ExportBundle } from './models'

function csvEscape(value: unknown): string {
	const str = String(value ?? '')
	if (/[",\n]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`
	}
	return str
}

function xmlEscape(value: unknown): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
}

function sqlEscape(value: unknown): string {
	return String(value ?? '').replace(/'/g, "''")
}

export function buildRawJson(bundle: ExportBundle): string {
	return JSON.stringify(
		{
			generated_at: bundle.generatedAtIso,
			project_name: bundle.projectName,
			project_path: bundle.projectPath,
			files: bundle.raw.files,
			commits: bundle.raw.commits,
			contributors: bundle.raw.contributors
		},
		null,
		2
	)
}

export function buildRawXml(bundle: ExportBundle): string {
	const files = bundle.raw.files
		.map(
			f =>
				`<file><path>${xmlEscape(f.path)}</path><language>${xmlEscape(
					f.language
				)}</language><total>${f.total}</total><blank>${f.blank}</blank><comment>${
					f.comment
				}</comment><code>${f.code}</code></file>`
		)
		.join('')

	const commits = bundle.raw.commits
		.map(
			c =>
				`<commit><commit_oid>${xmlEscape(c.commit_oid)}</commit_oid><timestamp>${
					c.timestamp
				}</timestamp><date>${xmlEscape(c.date)}</date><additions>${
					c.additions
				}</additions><deletions>${c.deletions}</deletions><total_loc>${
					c.total_loc
				}</total_loc><loc_by_language>${xmlEscape(
					JSON.stringify(c.loc_by_language)
				)}</loc_by_language></commit>`
		)
		.join('')

	const contributors = bundle.raw.contributors
		.map(
			c =>
				`<contributor><key>${xmlEscape(c.key)}</key><pseudo>${xmlEscape(
					c.pseudo
				)}</pseudo><name>${xmlEscape(c.name)}</name><email>${xmlEscape(
					c.email
				)}</email><commits>${c.commits}</commits><commit_percentage>${
					c.commit_percentage
				}</commit_percentage><lines>${c.lines}</lines><line_percentage>${
					c.line_percentage
				}</line_percentage><lines_per_commit>${
					c.lines_per_commit
				}</lines_per_commit><first_commit_date>${xmlEscape(
					c.first_commit_date
				)}</first_commit_date><last_commit_date>${xmlEscape(
					c.last_commit_date
				)}</last_commit_date></contributor>`
		)
		.join('')

	return `<?xml version="1.0" encoding="UTF-8"?>\n<export><generated_at>${xmlEscape(
		bundle.generatedAtIso
	)}</generated_at><project_name>${xmlEscape(
		bundle.projectName
	)}</project_name><project_path>${xmlEscape(bundle.projectPath)}</project_path><files>${files}</files><commits>${commits}</commits><contributors>${contributors}</contributors></export>`
}

export function buildRawSql(bundle: ExportBundle): string {
	const lines: string[] = []
	lines.push('-- CodePulse raw export')
	lines.push(`-- Generated at ${bundle.generatedAtIso}`)
	lines.push('')

	lines.push('DROP TABLE IF EXISTS files;')
	lines.push('CREATE TABLE files (')
	lines.push('  path TEXT NOT NULL,')
	lines.push('  language TEXT NOT NULL,')
	lines.push('  total INTEGER NOT NULL,')
	lines.push('  blank INTEGER NOT NULL,')
	lines.push('  comment INTEGER NOT NULL,')
	lines.push('  code INTEGER NOT NULL')
	lines.push(');')

	for (const f of bundle.raw.files) {
		lines.push(
			`INSERT INTO files(path, language, total, blank, comment, code) VALUES ('${sqlEscape(
				f.path
			)}', '${sqlEscape(f.language)}', ${f.total}, ${f.blank}, ${f.comment}, ${f.code});`
		)
	}
	lines.push('')

	lines.push('DROP TABLE IF EXISTS commits;')
	lines.push('CREATE TABLE commits (')
	lines.push('  commit_oid TEXT NOT NULL,')
	lines.push('  timestamp BIGINT NOT NULL,')
	lines.push('  date TEXT NOT NULL,')
	lines.push('  additions INTEGER NOT NULL,')
	lines.push('  deletions INTEGER NOT NULL,')
	lines.push('  total_loc BIGINT NOT NULL,')
	lines.push('  loc_by_language TEXT NOT NULL')
	lines.push(');')

	for (const c of bundle.raw.commits) {
		lines.push(
			`INSERT INTO commits(commit_oid, timestamp, date, additions, deletions, total_loc, loc_by_language) VALUES ('${sqlEscape(
				c.commit_oid
			)}', ${c.timestamp}, '${sqlEscape(c.date)}', ${c.additions}, ${c.deletions}, ${
				c.total_loc
			}, '${sqlEscape(JSON.stringify(c.loc_by_language))}');`
		)
	}
	lines.push('')

	lines.push('DROP TABLE IF EXISTS contributors;')
	lines.push('CREATE TABLE contributors (')
	lines.push('  key TEXT NOT NULL,')
	lines.push('  pseudo TEXT NOT NULL,')
	lines.push('  name TEXT NOT NULL,')
	lines.push('  email TEXT NOT NULL,')
	lines.push('  commits BIGINT NOT NULL,')
	lines.push('  commit_percentage REAL NOT NULL,')
	lines.push('  lines BIGINT NOT NULL,')
	lines.push('  line_percentage REAL NOT NULL,')
	lines.push('  lines_per_commit REAL NOT NULL,')
	lines.push('  first_commit_date TEXT NOT NULL,')
	lines.push('  last_commit_date TEXT NOT NULL')
	lines.push(');')

	for (const c of bundle.raw.contributors) {
		lines.push(
			`INSERT INTO contributors(key, pseudo, name, email, commits, commit_percentage, lines, line_percentage, lines_per_commit, first_commit_date, last_commit_date) VALUES ('${sqlEscape(
				c.key
			)}', '${sqlEscape(c.pseudo)}', '${sqlEscape(c.name)}', '${sqlEscape(c.email)}', ${
				c.commits
			}, ${c.commit_percentage}, ${c.lines}, ${c.line_percentage}, ${
				c.lines_per_commit
			}, '${sqlEscape(c.first_commit_date)}', '${sqlEscape(c.last_commit_date)}');`
		)
	}

	return lines.join('\n')
}

export function buildRawCsv(bundle: ExportBundle): string {
	const lines: string[] = []

	lines.push('### SHEET: Files')
	lines.push('path,language,total,blank,comment,code')
	for (const f of bundle.raw.files) {
		lines.push(
			[csvEscape(f.path), csvEscape(f.language), f.total, f.blank, f.comment, f.code].join(
				','
			)
		)
	}
	lines.push('')

	lines.push('### SHEET: Commits')
	lines.push('commit_oid,timestamp,date,additions,deletions,total_loc,loc_by_language')
	for (const c of bundle.raw.commits) {
		lines.push(
			[
				csvEscape(c.commit_oid),
				c.timestamp,
				csvEscape(c.date),
				c.additions,
				c.deletions,
				c.total_loc,
				csvEscape(JSON.stringify(c.loc_by_language))
			].join(',')
		)
	}
	lines.push('')

	lines.push('### SHEET: Contributors')
	lines.push(
		'key,pseudo,name,email,commits,commit_percentage,lines,line_percentage,lines_per_commit,first_commit_date,last_commit_date'
	)
	for (const c of bundle.raw.contributors) {
		lines.push(
			[
				csvEscape(c.key),
				csvEscape(c.pseudo),
				csvEscape(c.name),
				csvEscape(c.email),
				c.commits,
				c.commit_percentage,
				c.lines,
				c.line_percentage,
				c.lines_per_commit,
				csvEscape(c.first_commit_date),
				csvEscape(c.last_commit_date)
			].join(',')
		)
	}

	return lines.join('\n')
}
