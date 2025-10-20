export default function Titlebar() {
	return (
		<div
			className='fixed top-0 left-0 right-0 z-50 h-[calc(36px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]'
			data-tauri-drag-region
		></div>
	)
}
