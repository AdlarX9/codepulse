import { Code2, FolderOpen, GitBranch } from 'lucide-react'
import { useMainContext } from './MainContext'
import { LocalProject } from '@/types'

export default function Home() {
	const { selectAndScan, autoScanProjects, isAutoScanning, recentProjects, openRecentProject } =
		useMainContext()

	return (
		<div className='max-w-4xl mx-auto'>
			<div className='text-center mb-12'>
				<h1 className='text-4xl font-bold mb-4'>Welcome to CodePulse</h1>
				<p className='text-lg text-gray-600 mb-8'>
					Analyze your codebase instantly. All processing happens locally on your machine.
				</p>
				<button
					onClick={selectAndScan}
					className='px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium flex items-center gap-2 mx-auto'
				>
					<FolderOpen className='w-5 h-5' />
					Select a Project to Scan
				</button>

				<button
					onClick={() => {
						void autoScanProjects()
					}}
					disabled={isAutoScanning}
					className='mt-4 px-6 py-2.5 border border-blue-200 text-blue-700 rounded-lg bg-blue-50/60 hover:bg-blue-100/70 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2 mx-auto'
				>
					<GitBranch className='w-4 h-4' />
					{isAutoScanning ? 'Auto Scan in progress...' : 'Auto Scan My Git Repositories'}
				</button>
				<p className='mt-2 text-xs text-gray-500'>
					Find repositories in your home directory where your configured Git identity
					already contributed.
				</p>
			</div>

			{recentProjects.length > 0 && (
				<div className='mt-12'>
					<h2 className='text-2xl font-semibold mb-4'>Recent Projects</h2>
					<div className='grid gap-4'>
						{recentProjects.map((project: LocalProject) => (
							<button
								key={project.id}
								onClick={() => openRecentProject(project)}
								className='p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left'
							>
								<div className='flex items-center gap-3'>
									<Code2 className='w-5 h-5 text-blue-600' />
									<div>
										<div className='font-medium'>{project.name}</div>
										<div className='text-sm text-gray-500'>{project.path}</div>
									</div>
								</div>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
