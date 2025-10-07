import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const { searchParams } = new URL(req.url)
		const handle = searchParams.get('handle')

		// Get project data
		const { data: project, error } = await supabaseAdmin
			.from('projects')
			.select(
				`
        *,
        scans!inner (
          total,
          code,
          comment,
          blank,
          core_code_lines,
          info_lines,
          comment_ratio,
          created_at
        ),
        profiles!inner (
          handle,
          display_name
        )
      `
			)
			.eq('id', params.id)
			.eq('visibility', 'public')
			.single()

		if (error || !project) {
			return new ImageResponse(
				(
					<div
						style={{
							height: '100%',
							width: '100%',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							backgroundColor: '#1f2937',
							color: 'white'
						}}
					>
						<div style={{ fontSize: 40 }}>Project Not Found</div>
					</div>
				),
				{
					width: 1200,
					height: 630
				}
			)
		}

		// TypeScript assertion pour contourner les types Supabase
		const projectData = project as any
		const latestScan = projectData.scans?.sort(
			(a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		)[0]

		const profile = projectData.profiles?.[0]
		const projectName = projectData.name || `${profile?.handle}'s Project`

		return new ImageResponse(
			(
				<div
					style={{
						height: '100%',
						width: '100%',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						backgroundColor: '#0f172a',
						backgroundImage:
							'radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1e293b 2%, transparent 0%)',
						backgroundSize: '100px 100px'
					}}
				>
					{/* Header */}
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							marginBottom: 40
						}}
					>
						<div
							style={{
								width: 80,
								height: 80,
								backgroundColor: '#3b82f6',
								borderRadius: 20,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								marginRight: 24,
								fontSize: 32,
								fontWeight: 'bold',
								color: 'white'
							}}
						>
							CP
						</div>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								color: 'white'
							}}
						>
							<div style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 4 }}>
								CodePulse
							</div>
							<div style={{ fontSize: 18, opacity: 0.7 }}>Code Analytics</div>
						</div>
					</div>

					{/* Project Name */}
					<div
						style={{
							fontSize: 48,
							fontWeight: 'bold',
							color: 'white',
							textAlign: 'center',
							marginBottom: 40,
							maxWidth: 1000
						}}
					>
						{projectName}
					</div>

					{/* Stats */}
					{latestScan && (
						<div
							style={{
								display: 'flex',
								gap: 60,
								alignItems: 'center',
								justifyContent: 'center',
								marginBottom: 40
							}}
						>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									color: 'white'
								}}
							>
								<div style={{ fontSize: 32, fontWeight: 'bold', color: '#3b82f6' }}>
									{latestScan.total.toLocaleString()}
								</div>
								<div style={{ fontSize: 16, opacity: 0.7 }}>Total Lines</div>
							</div>

							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									color: 'white'
								}}
							>
								<div style={{ fontSize: 32, fontWeight: 'bold', color: '#10b981' }}>
									{latestScan.core_code_lines.toLocaleString()}
								</div>
								<div style={{ fontSize: 16, opacity: 0.7 }}>Core Code</div>
							</div>

							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									color: 'white'
								}}
							>
								<div style={{ fontSize: 32, fontWeight: 'bold', color: '#f59e0b' }}>
									{(latestScan.comment_ratio * 100).toFixed(1)}%
								</div>
								<div style={{ fontSize: 16, opacity: 0.7 }}>Comments</div>
							</div>
						</div>
					)}

					{/* Footer */}
					<div
						style={{
							position: 'absolute',
							bottom: 40,
							right: 40,
							display: 'flex',
							alignItems: 'center',
							color: 'white',
							fontSize: 14,
							opacity: 0.6
						}}
					>
						{profile?.handle && `@${profile.handle} • `}codepulse.dev
					</div>
				</div>
			),
			{
				width: 1200,
				height: 630
			}
		)
	} catch (error) {
		console.error('OG image generation error:', error)

		return new ImageResponse(
			(
				<div
					style={{
						height: '100%',
						width: '100%',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						backgroundColor: '#1f2937',
						color: 'white'
					}}
				>
					<div style={{ fontSize: 40 }}>CodePulse</div>
					<div style={{ fontSize: 20, marginTop: 20, opacity: 0.7 }}>
						Code Analytics Platform
					</div>
				</div>
			),
			{
				width: 1200,
				height: 630
			}
		)
	}
}
