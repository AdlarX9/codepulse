function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
}

function toPath(points: Array<{ x: number; y: number }>): string {
	if (points.length === 0) {
		return ''
	}
	return points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

export function makeLineChartSvg(
	series: Array<{ label: string; value: number }>,
	opts: { width?: number; height?: number; stroke?: string; title?: string } = {}
): string {
	const width = opts.width ?? 500
	const height = opts.height ?? 200
	const padding = 30
	const stroke = opts.stroke ?? '#2563EB'
	const title = opts.title ?? 'Line chart'

	if (series.length === 0) {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="border:1px solid #ccc"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">No data</text></svg>`
	}

	const max = Math.max(1, ...series.map(s => s.value))
	const min = Math.min(0, ...series.map(s => s.value))
	const span = Math.max(1, max - min)
	const stepX = series.length > 1 ? (width - padding * 2) / (series.length - 1) : 0

	const points = series.map((s, index) => ({
		x: padding + index * stepX,
		y: padding + ((max - s.value) / span) * (height - padding * 2)
	}))

	const circles = points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${stroke}" />`).join('')

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="border:1px solid #e2e8f0;border-radius:4px">
<rect width="${width}" height="${height}" fill="#ffffff" />
<text x="${padding}" y="18" font-size="11" fill="#334155" font-weight="500">${escapeXml(title)}</text>
<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#cbd5e1" stroke-width="1"/>
<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#cbd5e1" stroke-width="1"/>
<path d="${toPath(points)}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
${circles}
</svg>`
}

export function makeBarChartSvg(
	series: Array<{ label: string; value: number; color?: string }>,
	opts: { width?: number; height?: number; title?: string } = {}
): string {
	const width = opts.width ?? 500
	const height = opts.height ?? 220
	const padding = 30
	const title = opts.title ?? 'Bar chart'

	if (series.length === 0) {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="border:1px solid #ccc"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">No data</text></svg>`
	}

	const max = Math.max(1, ...series.map(s => Math.abs(s.value)))
	const innerWidth = width - padding * 2
	const innerHeight = height - padding * 2
	const barWidth = innerWidth / series.length
	const barPadding = Math.max(2, barWidth * 0.15)

	const bars = series
		.map((s, index) => {
			if (Math.abs(s.value) === 0) return ''
			const normalized = Math.abs(s.value) / max
			const h = normalized * innerHeight
			const x = padding + index * barWidth + barPadding
			const y = padding + innerHeight - h
			const w = barWidth - barPadding * 2
			const color = s.color ?? (s.value < 0 ? '#ef4444' : '#10b981')
			return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" rx="2" />`
		})
		.join('')

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="border:1px solid #e2e8f0;border-radius:4px">
<rect width="${width}" height="${height}" fill="#ffffff" />
<text x="${padding}" y="18" font-size="11" fill="#334155" font-weight="500">${escapeXml(title)}</text>
<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#cbd5e1" stroke-width="1"/>
${bars}
</svg>`
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
	const rad = ((angleDeg - 90) * Math.PI) / 180
	return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
	const start = polar(cx, cy, r, endAngle)
	const end = polar(cx, cy, r, startAngle)
	const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
	return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`
}

export function makeDonutChartSvg(
	series: Array<{ label: string; value: number; color?: string }>,
	opts: { width?: number; height?: number; title?: string } = {}
): string {
	const width = opts.width ?? 480
	const height = opts.height ?? 220
	const title = opts.title ?? 'Donut chart'
	const cx = 80
	const cy = 110
	const r = 60

	const total = Math.max(1, series.reduce((acc, s) => acc + Math.max(0, s.value), 0))
	let angle = 0

	const slices = series
		.filter(s => s.value > 0)
		.map((s, index) => {
			const part = (Math.max(0, s.value) / total) * 360
			const start = angle
			const end = angle + part
			angle = end
			const color = s.color ?? ['#2563EB', '#10B981', '#F59E0B', '#EF4444'][index % 4]
			return `<path d="${arcPath(cx, cy, r, start, end)}" fill="${color}" />`
		})
		.join('')

	const legend = series
		.filter(s => s.value > 0)
		.slice(0, 6)
		.map((s, i) => {
			const y = 24 + i * 18
			const color = s.color ?? ['#2563EB', '#10B981', '#F59E0B', '#EF4444'][i % 4]
			return `<rect x="200" y="${y}" width="8" height="8" fill="${color}" rx="1"/><text x="214" y="${y + 7}" font-size="10" fill="#334155">${escapeXml(
				s.label.substring(0, 20)
			)}</text>`
		})
		.join('')

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="border:1px solid #e2e8f0;border-radius:4px">
<rect width="${width}" height="${height}" fill="#ffffff" />
<text x="16" y="16" font-size="11" fill="#334155" font-weight="500">${escapeXml(title)}</text>
${slices}
<circle cx="${cx}" cy="${cy}" r="30" fill="#fff" />
${legend}
</svg>`
}

export function svgToDataUri(svg: string): string {
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
