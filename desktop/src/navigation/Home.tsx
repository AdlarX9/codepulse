import { Code2, FolderOpen } from 'lucide-react'
import { useMainContext } from './MainContext'
import { LocalProject } from '@/types'

export default function Home() {
	const { selectAndScan, recentProjects, openRecentProject } = useMainContext()

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
