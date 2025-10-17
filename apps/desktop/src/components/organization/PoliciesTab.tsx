import { useState, useEffect } from 'react'
import { orgApi } from '../../lib/api-org'
import type { Policy } from '../../types/organization'
import { Card } from '../ui/Card'
import { SimpleButton as Button } from '../ui/SimpleButton'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'

interface PoliciesTabProps {
	orgId: string
	plan: string
}

export default function PoliciesTab({ orgId, plan }: PoliciesTabProps) {
	const [policies, setPolicies] = useState<Policy[]>([])
	const [loading, setLoading] = useState(true)
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
	const [formData, setFormData] = useState({
		name: '',
		scope: 'org' as 'org' | 'repo',
		min_comment_ratio: '',
		max_bloat_ratio: '',
		min_doc_coverage: '',
		block_on_fail: false,
		enabled: true
	})

	const maxPolicies = plan === 'free' ? 1 : plan === 'pro' ? 5 : Infinity

	useEffect(() => {
		loadPolicies()
	}, [orgId])

	async function loadPolicies() {
		try {
			setLoading(true)
			const data = await orgApi.getPolicies(orgId)
			setPolicies(data)
		} catch (error) {
			console.error('Failed to load policies:', error)
		} finally {
			setLoading(false)
		}
	}

	function resetForm() {
		setFormData({
			name: '',
			scope: 'org',
			min_comment_ratio: '',
			max_bloat_ratio: '',
			min_doc_coverage: '',
			block_on_fail: false,
			enabled: true
		})
		setEditingPolicy(null)
	}

	function openEditModal(policy: Policy) {
		setFormData({
			name: policy.name,
			scope: policy.scope,
			min_comment_ratio: policy.min_comment_ratio?.toString() || '',
			max_bloat_ratio: policy.max_bloat_ratio?.toString() || '',
			min_doc_coverage: policy.min_doc_coverage?.toString() || '',
			block_on_fail: policy.block_on_fail,
			enabled: policy.enabled
		})
		setEditingPolicy(policy)
		setShowCreateModal(true)
	}

	async function handleSave() {
		if (!formData.name.trim()) return

		const policyData = {
			name: formData.name,
			scope: formData.scope,
			min_comment_ratio: formData.min_comment_ratio
				? parseFloat(formData.min_comment_ratio)
				: undefined,
			max_bloat_ratio: formData.max_bloat_ratio
				? parseFloat(formData.max_bloat_ratio)
				: undefined,
			min_doc_coverage: formData.min_doc_coverage
				? parseFloat(formData.min_doc_coverage)
				: undefined,
			block_on_fail: formData.block_on_fail,
			enabled: formData.enabled
		}

		try {
			if (editingPolicy) {
				await orgApi.updatePolicy(orgId, editingPolicy.id, policyData)
			} else {
				await orgApi.createPolicy(orgId, policyData)
			}
			await loadPolicies()
			setShowCreateModal(false)
			resetForm()
		} catch (error) {
			console.error('Failed to save policy:', error)
			alert('Failed to save policy')
		}
	}

	async function handleDelete(policyId: string) {
		if (!confirm('Are you sure you want to delete this policy?')) return

		try {
			await orgApi.deletePolicy(orgId, policyId)
			await loadPolicies()
		} catch (error) {
			console.error('Failed to delete policy:', error)
			alert('Failed to delete policy')
		}
	}

	async function toggleEnabled(policy: Policy) {
		try {
			await orgApi.updatePolicy(orgId, policy.id, { enabled: !policy.enabled })
			await loadPolicies()
		} catch (error) {
			console.error('Failed to toggle policy:', error)
			alert('Failed to update policy')
		}
	}

	const canCreateMore = policies.length < maxPolicies

	if (loading) {
		return <div className='text-center py-8'>Loading policies...</div>
	}

	return (
		<div className='space-y-6'>
			<Card>
				<div className='p-6'>
					<div className='flex items-center justify-between mb-6'>
						<div>
							<h3 className='text-lg font-semibold text-gray-900'>
								Quality Policies
							</h3>
							<p className='text-sm text-gray-600 mt-1'>
								Define quality standards for your repositories ({policies.length}/
								{maxPolicies === Infinity ? '∞' : maxPolicies})
							</p>
						</div>
						<Button
							onClick={() => {
								resetForm()
								setShowCreateModal(true)
							}}
							disabled={!canCreateMore}
						>
							Create Policy
						</Button>
					</div>

					{!canCreateMore && (
						<div className='mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
							<p className='text-sm text-yellow-800'>
								You've reached the limit of {maxPolicies}{' '}
								{maxPolicies === 1 ? 'policy' : 'policies'} for the {plan} plan.
								Upgrade to create more policies.
							</p>
						</div>
					)}

					{policies.length === 0 ? (
						<div className='text-center py-8 text-gray-600'>
							No policies configured yet. Create your first quality policy!
						</div>
					) : (
						<div className='space-y-4'>
							{policies.map(policy => (
								<div
									key={policy.id}
									className='border border-gray-200 rounded-lg p-4'
								>
									<div className='flex items-start justify-between'>
										<div className='flex-1'>
											<div className='flex items-center gap-3 mb-2'>
												<h4 className='font-semibold text-gray-900'>
													{policy.name}
												</h4>
												<Badge
													variant={
														policy.scope === 'org'
															? 'primary'
															: 'default'
													}
												>
													{policy.scope.toUpperCase()}
												</Badge>
												{policy.enabled ? (
													<Badge variant='success'>Active</Badge>
												) : (
													<Badge variant='default'>Disabled</Badge>
												)}
												{policy.block_on_fail && (
													<Badge variant='danger'>Blocking</Badge>
												)}
											</div>
											<div className='grid grid-cols-3 gap-4 text-sm'>
												{policy.min_comment_ratio !== undefined && (
													<div>
														<span className='text-gray-600'>
															Min Comment Ratio:
														</span>{' '}
														<span className='font-medium'>
															{(
																policy.min_comment_ratio * 100
															).toFixed(1)}
															%
														</span>
													</div>
												)}
												{policy.max_bloat_ratio !== undefined && (
													<div>
														<span className='text-gray-600'>
															Max Bloat Ratio:
														</span>{' '}
														<span className='font-medium'>
															{(policy.max_bloat_ratio * 100).toFixed(
																1
															)}
															%
														</span>
													</div>
												)}
												{policy.min_doc_coverage !== undefined && (
													<div>
														<span className='text-gray-600'>
															Min Doc Coverage:
														</span>{' '}
														<span className='font-medium'>
															{(
																policy.min_doc_coverage * 100
															).toFixed(1)}
															%
														</span>
													</div>
												)}
											</div>
										</div>
										<div className='flex items-center gap-2'>
											<button
												onClick={() => toggleEnabled(policy)}
												className='text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded'
											>
												{policy.enabled ? 'Disable' : 'Enable'}
											</button>
											<button
												onClick={() => openEditModal(policy)}
												className='text-blue-600 hover:text-blue-800'
											>
												<svg
													className='w-5 h-5'
													fill='none'
													viewBox='0 0 24 24'
													stroke='currentColor'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={2}
														d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
													/>
												</svg>
											</button>
											<button
												onClick={() => handleDelete(policy.id)}
												className='text-red-600 hover:text-red-800'
											>
												<svg
													className='w-5 h-5'
													fill='none'
													viewBox='0 0 24 24'
													stroke='currentColor'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={2}
														d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
													/>
												</svg>
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</Card>

			<Modal
				isOpen={showCreateModal}
				onClose={() => {
					setShowCreateModal(false)
					resetForm()
				}}
				size='lg'
			>
				<ModalHeader
					onClose={() => {
						setShowCreateModal(false)
						resetForm()
					}}
				>
					{editingPolicy ? 'Edit Policy' : 'Create Quality Policy'}
				</ModalHeader>
				<ModalBody>
					<div className='space-y-4'>
						<Input
							label='Policy Name'
							value={formData.name}
							onChange={val => setFormData({ ...formData, name: val })}
							placeholder='Production Quality Standards'
							required
						/>

						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>
								Scope
							</label>
							<select
								value={formData.scope}
								onChange={e =>
									setFormData({
										...formData,
										scope: e.target.value as 'org' | 'repo'
									})
								}
								className='block w-full px-3 py-2 border border-gray-300 rounded-md'
							>
								<option value='org'>Organization-wide</option>
								<option value='repo'>Repository-specific</option>
							</select>
						</div>

						<div className='grid grid-cols-2 gap-4'>
							<Input
								type='number'
								label='Min Comment Ratio (%)'
								value={formData.min_comment_ratio}
								onChange={val =>
									setFormData({ ...formData, min_comment_ratio: val })
								}
								placeholder='15'
							/>
							<Input
								type='number'
								label='Max Bloat Ratio (%)'
								value={formData.max_bloat_ratio}
								onChange={val => setFormData({ ...formData, max_bloat_ratio: val })}
								placeholder='30'
							/>
						</div>

						<Input
							type='number'
							label='Min Documentation Coverage (%)'
							value={formData.min_doc_coverage}
							onChange={val => setFormData({ ...formData, min_doc_coverage: val })}
							placeholder='20'
						/>

						<div className='flex items-center gap-4'>
							<label className='flex items-center gap-2'>
								<input
									type='checkbox'
									checked={formData.block_on_fail}
									onChange={e =>
										setFormData({
											...formData,
											block_on_fail: e.target.checked
										})
									}
									className='rounded'
									disabled={plan === 'free' || plan === 'pro'}
								/>
								<span className='text-sm text-gray-700'>
									Block PR merges on failure{' '}
									{plan === 'free' || plan === 'pro' ? '(Team plan+)' : ''}
								</span>
							</label>
							<label className='flex items-center gap-2'>
								<input
									type='checkbox'
									checked={formData.enabled}
									onChange={e =>
										setFormData({ ...formData, enabled: e.target.checked })
									}
									className='rounded'
								/>
								<span className='text-sm text-gray-700'>Enabled</span>
							</label>
						</div>
					</div>
				</ModalBody>
				<ModalFooter>
					<Button
						variant='secondary'
						onClick={() => {
							setShowCreateModal(false)
							resetForm()
						}}
					>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={!formData.name.trim()}>
						{editingPolicy ? 'Update' : 'Create'} Policy
					</Button>
				</ModalFooter>
			</Modal>
		</div>
	)
}
