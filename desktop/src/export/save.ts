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

export async function savePdfFromHtml(html: string, defaultName: string): Promise<boolean> {
	const filePath = await save({
		defaultPath: `${defaultName}.pdf`,
		filters: [{ name: 'PDF', extensions: ['pdf'] }]
	})
	if (!filePath) {
		return false
	}

	const container = document.createElement('div')
	container.style.position = 'absolute'
	container.style.left = '-9999px'
	container.style.top = '0'
	container.style.width = '210mm'
	container.style.background = 'white'
	container.innerHTML = html
	document.body.appendChild(container)

	try {
		await new Promise(resolve => setTimeout(resolve, 100))
		const pdf = new jsPDF('p', 'mm', 'a4')
		const pageWidth = pdf.internal.pageSize.getWidth()

		await pdf.html(container, {
			x: 10,
			y: 10,
			width: pageWidth - 20,
			autoPaging: true,
			html2canvas: {
				scale: 2,
				useCORS: true,
				logging: false,
				backgroundColor: '#ffffff'
			}
		})

		const arrayBuffer = pdf.output('arraybuffer')
		await writeBinaryFile(filePath, new Uint8Array(arrayBuffer))
		return true
	} finally {
		container.remove()
	}
}
