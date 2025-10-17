import { useState, useEffect } from 'react'
import { orgApi } from '../lib/api-org'
import type { Organization } from '../types/organization'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { Card } from '../components/ui/Card'
import { SimpleButton as Button } from '../components/ui/SimpleButton'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import TeamTab from '../components/organization/TeamTab'
import PoliciesTab from '../components/organization/PoliciesTab'
import RepositoriesTab from '../components/organization/RepositoriesTab'
import BillingTab from '../components/organization/BillingTab'
import IntegrationsTab from '../components/organization/IntegrationsTab'

interface OrganizationPageProps {
	onBack: () => void
}

export default function OrganizationPage({ onBack }: OrganizationPageProps) {
	const [orgs, setOrgs] = useState<Organization[]>([])
	const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
	const [loading, setLoading] = useState(true)
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [newOrgName, setNewOrgName] = useState('')
	const [creating, setCreating] = useState(false)

	useEffect(() => {
		loadOrgs()
	}, [])

	async function loadOrgs() {
		try {
			setLoading(true)
			const data = await orgApi.getUserOrgs()
			setOrgs(data)
			if (data.length > 0 && !selectedOrg) {
				setSelectedOrg(data[0])
			}
		} catch (error) {
			console.error('Failed to load organizations:', error)
		} finally {
			setLoading(false)
		}
	}

	async function handleCreateOrg() {
		if (!newOrgName.trim()) return

		try {
			setCreating(true)
			const newOrg = await orgApi.createOrg({ name: newOrgName })
			setOrgs([...orgs, newOrg])
			setSelectedOrg(newOrg)
			setShowCreateModal(false)
			setNewOrgName('')
		} catch (error) {
			console.error('Failed to create organization:', error)
			alert('Failed to create organization')
		} finally {
			setCreating(false)
		}
	}

	if (loading) {
		return (
			<div className='flex items-center justify-center h-screen'>
				<div className='text-gray-600'>Loading organizations...</div>
			</div>
		)
	}

	if (orgs.length === 0) {
		return (
			<div className='min-h-screen bg-gray-50 flex items-center justify-center p-6'>
				<Card className='max-w-md w-full p-8 text-center'>
					<div className='mb-4'>
						<div className='mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4'>
							<svg
								className='w-8 h-8 text-blue-600'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
								/>
							</svg>
						</div>
						<h2 className='text-2xl font-bold text-gray-900 mb-2'>
							Create Your First Organization
						</h2>
						<p className='text-gray-600 mb-6'>
							Organizations help you manage team members, repositories, and quality
							policies.
						</p>
					</div>
					<Button onClick={() => setShowCreateModal(true)} className='w-full'>
						Create Organization
					</Button>
					<Button variant='ghost' onClick={onBack} className='w-full mt-2'>
						Back to Projects
					</Button>
				</Card>

				<Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
					<ModalHeader onClose={() => setShowCreateModal(false)}>
						Create Organization
					</ModalHeader>
					<ModalBody>
						<Input
							label='Organization Name'
							value={newOrgName}
							onChange={setNewOrgName}
							placeholder='Acme Inc.'
							required
						/>
					</ModalBody>
					<ModalFooter>
						<Button variant='secondary' onClick={() => setShowCreateModal(false)}>
							Cancel
						</Button>
						<Button onClick={handleCreateOrg} disabled={creating || !newOrgName.trim()}>
							{creating ? 'Creating...' : 'Create'}
						</Button>
					</ModalFooter>
				</Modal>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-gray-50'>
			{/* Header */}
			<div className='bg-white border-b border-gray-200'>
				<div className='max-w-7xl mx-auto px-6 py-4'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-4'>
							<button onClick={onBack} className='text-gray-600 hover:text-gray-900'>
								<svg
									className='w-6 h-6'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M15 19l-7-7 7-7'
									/>
								</svg>
							</button>
							<div>
								<h1 className='text-2xl font-bold text-gray-900'>
									{selectedOrg?.name}
								</h1>
								<p className='text-sm text-gray-600'>
									Manage your organization settings and team
								</p>
							</div>
						</div>

						<div className='flex items-center gap-3'>
							{selectedOrg?.subscription && (
								<Badge
									variant={
										selectedOrg.subscription.plan === 'free'
											? 'default'
											: 'primary'
									}
								>
									{selectedOrg.subscription.plan.toUpperCase()}
								</Badge>
							)}
							{orgs.length > 1 && (
								<select
									value={selectedOrg?.id}
									onChange={e => {
										const org = orgs.find(o => o.id === e.target.value)
										if (org) setSelectedOrg(org)
									}}
									className='px-3 py-2 border border-gray-300 rounded-md'
								>
									{orgs.map(org => (
										<option key={org.id} value={org.id}>
											{org.name}
										</option>
									))}
								</select>
							)}
							<Button onClick={() => setShowCreateModal(true)} size='sm'>
								New Organization
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className='max-w-7xl mx-auto px-6 py-6'>
				{selectedOrg && (
					<Tabs defaultValue='team'>
						<TabsList>
							<TabsTrigger value='team'>Team</TabsTrigger>
							<TabsTrigger value='repositories'>Repositories</TabsTrigger>
							<TabsTrigger value='policies'>Quality Policies</TabsTrigger>
							<TabsTrigger value='billing'>Billing</TabsTrigger>
							<TabsTrigger value='integrations'>Integrations</TabsTrigger>
						</TabsList>

						<TabsContent value='team'>
							<TeamTab orgId={selectedOrg.id} />
						</TabsContent>

						<TabsContent value='repositories'>
							<RepositoriesTab orgId={selectedOrg.id} />
						</TabsContent>

						<TabsContent value='policies'>
							<PoliciesTab
								orgId={selectedOrg.id}
								plan={selectedOrg.subscription?.plan || 'free'}
							/>
						</TabsContent>

						<TabsContent value='billing'>
							<BillingTab
								orgId={selectedOrg.id}
								subscription={selectedOrg.subscription}
							/>
						</TabsContent>

						<TabsContent value='integrations'>
							<IntegrationsTab orgId={selectedOrg.id} />
						</TabsContent>
					</Tabs>
				)}
			</div>

			{/* Create Org Modal */}
			<Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
				<ModalHeader onClose={() => setShowCreateModal(false)}>
					Create New Organization
				</ModalHeader>
				<ModalBody>
					<Input
						label='Organization Name'
						value={newOrgName}
						onChange={setNewOrgName}
						placeholder='Acme Inc.'
						required
					/>
					<p className='mt-2 text-sm text-gray-600'>
						Create a new organization to manage team members and repositories.
					</p>
				</ModalBody>
				<ModalFooter>
					<Button variant='secondary' onClick={() => setShowCreateModal(false)}>
						Cancel
					</Button>
					<Button onClick={handleCreateOrg} disabled={creating || !newOrgName.trim()}>
						{creating ? 'Creating...' : 'Create Organization'}
					</Button>
				</ModalFooter>
			</Modal>
		</div>
	)
}
