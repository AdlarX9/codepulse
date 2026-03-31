import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { save } from '@tauri-apps/api/dialog'
import { writeBinaryFile, writeTextFile } from '@tauri-apps/api/fs'

export async function saveTextArtifact(
	content: string,
	defaultName: string,
	extension: string,
	label: string
): Promise<boolean> {
	const filePath = await save({
		defaultPath: `${defaultName}.${extension}`,
		filters: [{ name: label, extensions: [extension] }]
	})

	if (!filePath) {
		return false
	}

	await writeTextFile(filePath, content)
	return true
}

function buildPdfCaptureNode(html: string): HTMLDivElement {
	const parsed = new DOMParser().parseFromString(html, 'text/html')
	const container = document.createElement('div')
	container.style.position = 'fixed'
	container.style.left = '0'
	container.style.top = '0'
	container.style.zIndex = '-1'
	container.style.pointerEvents = 'none'
	container.style.width = '1200px'
	container.style.maxWidth = '1200px'
	container.style.background = '#ffffff'
	container.style.padding = '0'
	container.style.margin = '0'
	container.style.boxSizing = 'border-box'

	const scopedStyle = document.createElement('style')
	scopedStyle.textContent = Array.from(parsed.head.querySelectorAll('style'))
		.map(styleNode => styleNode.textContent ?? '')
		.join('\n')
		.replace(/\bbody\b/g, '.pdf-export-root')
	container.appendChild(scopedStyle)

	const contentNode = document.createElement('div')
	contentNode.className = 'pdf-export-root'
	contentNode.innerHTML = parsed.body.innerHTML
	container.appendChild(contentNode)

	return container
}

async function renderHtmlToCanvas(container: HTMLElement): Promise<HTMLCanvasElement> {
	if ('fonts' in document) {
		await (document as Document & { fonts: FontFaceSet }).fonts.ready
	}

	await new Promise<void>(resolve => {
		requestAnimationFrame(() => resolve())
	})

	const width = Math.max(container.scrollWidth, container.clientWidth)
	const height = Math.max(container.scrollHeight, container.clientHeight)

	return html2canvas(container, {
		backgroundColor: '#ffffff',
		scale: 3,
		useCORS: true,
		logging: false,
		width,
		height,
		windowWidth: width,
		windowHeight: height,
		scrollX: 0,
		scrollY: 0
	})
}

function buildPdfFromCanvas(canvas: HTMLCanvasElement): jsPDF {
	const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
	const pageWidth = pdf.internal.pageSize.getWidth()
	const pageHeight = pdf.internal.pageSize.getHeight()
	const margin = 8
	const contentWidth = pageWidth - margin * 2
	const contentHeight = pageHeight - margin * 2
	const pageSliceHeightPx = Math.max(1, Math.floor((contentHeight * canvas.width) / contentWidth))

	let renderedHeightPx = 0
	let pageIndex = 0

	while (renderedHeightPx < canvas.height) {
		const currentSliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - renderedHeightPx)
		const pageCanvas = document.createElement('canvas')
		pageCanvas.width = canvas.width
		pageCanvas.height = currentSliceHeightPx

		const context = pageCanvas.getContext('2d')
		if (!context) {
			throw new Error('Cannot create 2D canvas context for PDF export')
		}

		context.fillStyle = '#ffffff'
		context.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
		context.drawImage(
			canvas,
			0,
			renderedHeightPx,
			canvas.width,
			currentSliceHeightPx,
			0,
			0,
			canvas.width,
			currentSliceHeightPx
		)

		if (pageIndex > 0) {
			pdf.addPage()
		}

		const imageData = pageCanvas.toDataURL('image/jpeg', 0.95)
		const renderedHeightMm = (currentSliceHeightPx * contentWidth) / canvas.width
		pdf.addImage(
			imageData,
			'JPEG',
			margin,
			margin,
			contentWidth,
			renderedHeightMm,
			undefined,
			'FAST'
		)

		renderedHeightPx += currentSliceHeightPx
		pageIndex += 1
	}

	return pdf
}

export async function savePdfFromHtml(html: string, defaultName: string): Promise<boolean> {
	const filePath = await save({
		defaultPath: `${defaultName}.pdf`,
		filters: [{ name: 'PDF', extensions: ['pdf'] }]
	})
	if (!filePath) {
		return false
	}

	const container = buildPdfCaptureNode(html)
	document.body.appendChild(container)

	try {
		const canvas = await renderHtmlToCanvas(container)
		const pdf = buildPdfFromCanvas(canvas)
		const arrayBuffer = pdf.output('arraybuffer')
		await writeBinaryFile(filePath, new Uint8Array(arrayBuffer))
		return true
	} catch {
		return false
	} finally {
		container.remove()
	}
}
