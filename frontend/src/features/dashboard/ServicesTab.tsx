import { extractApiError } from '@/api/client'
import type { CreateServicePayload, UpdateServicePayload } from '@/api/services'
import {
	createService,
	deleteService,
	getMyServices,
	updateService,
} from '@/api/services'
import type { Service, ServiceCategory, ServiceLevel } from '@/types'
import { SERVICE_CATEGORIES, SERVICE_LEVELS } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Briefcase, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'

const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
	{ value: 'mathematics', label: 'Математика' },
	{ value: 'economics', label: 'Экономика' },
	{ value: 'informatics', label: 'Информатика' },
	{ value: 'law', label: 'Юриспруденция' },
	{ value: 'history', label: 'История' },
	{ value: 'psychology', label: 'Психология' },
	{ value: 'physics', label: 'Физика' },
	{ value: 'chemistry', label: 'Химия' },
	{ value: 'biology', label: 'Биология' },
	{ value: 'engineering', label: 'Инженерия' },
	{ value: 'management', label: 'Менеджмент' },
	{ value: 'other', label: 'Другое' },
]

const LEVEL_OPTIONS: { value: ServiceLevel; label: string }[] = [
	{ value: 'bachelor', label: 'Бакалавриат' },
	{ value: 'specialist', label: 'Специалитет' },
	{ value: 'master', label: 'Магистратура' },
]

const PACKAGE_LABELS = ['Базовый', 'Стандарт', 'Премиум'] as const

function ServiceCard({
	service,
	onEdit,
	onDelete,
}: {
	service: Service
	onEdit: (service: Service) => void
	onDelete: (id: string) => void
}) {
	return (
		<div className='p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors'>
			<div className='flex items-start justify-between gap-3'>
				<div className='flex-1 min-w-0'>
					<Link
						to='/services/$serviceId'
						params={{ serviceId: service.id }}
						className='font-medium text-foreground text-sm hover:text-primary transition-colors line-clamp-1'
					>
						{service.title}
					</Link>
					<p className='text-xs text-muted-foreground mt-0.5'>
						{SERVICE_CATEGORIES[service.category]} ·{' '}
						{SERVICE_LEVELS[service.level]}
					</p>
					{service.packages[0] && (
						<p className='text-xs text-foreground/70 mt-1'>
							от{' '}
							{new Intl.NumberFormat('ru-RU', {
								style: 'currency',
								currency: 'RUB',
								maximumFractionDigits: 0,
							}).format(service.packages[0].price)}
						</p>
					)}
				</div>
				<div className='flex items-center gap-1'>
					<button
						onClick={() => onEdit(service)}
						className='shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors'
						title='Редактировать услугу'
					>
						<Pencil className='w-4 h-4' />
					</button>
					<button
						onClick={() => onDelete(service.id)}
						className='shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors'
						title='Удалить услугу'
					>
						<Trash2 className='w-4 h-4' />
					</button>
				</div>
			</div>
		</div>
	)
}

export function ServicesTab({ freelancerId }: { freelancerId: string }) {
	const queryClient = useQueryClient()
	const [showForm, setShowForm] = useState(false)

	// ── form state ──
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [category, setCategory] = useState<ServiceCategory>('informatics')
	const [level, setLevel] = useState<ServiceLevel>('bachelor')
	const [tags, setTags] = useState('')
	const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
	const [packages, setPackages] = useState([
		{
			id: undefined as string | undefined,
			name: 'Базовый',
			price: '',
			deliveryDays: '',
			revisions: '-1',
			description: '',
		},
	])
	const [formError, setFormError] = useState('')

	const { data: services = [], isLoading } = useQuery({
		queryKey: ['my-services', freelancerId],
		queryFn: () => getMyServices(freelancerId),
		enabled: !!freelancerId,
	})

	const { mutate: removeService } = useMutation({
		mutationFn: deleteService,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['my-services', freelancerId],
			})
			queryClient.invalidateQueries({ queryKey: ['services'] })
			queryClient.invalidateQueries({
				queryKey: ['freelancer-services', freelancerId],
			})
			queryClient.invalidateQueries({ queryKey: ['featured-services'] })
			queryClient.invalidateQueries({ queryKey: ['popular-services'] })
			queryClient.invalidateQueries({ queryKey: ['top-freelancers'] })
		},
		onError: (err: unknown) => {
			setFormError(extractApiError(err, 'Не удалось удалить услугу'))
		},
	})

	const { mutate: submitService, isPending: creating } = useMutation({
		mutationFn: (payload: CreateServicePayload) => createService(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['my-services', freelancerId] })
			queryClient.invalidateQueries({ queryKey: ['services'] })
			queryClient.invalidateQueries({
				queryKey: ['freelancer-services', freelancerId],
			})
			queryClient.invalidateQueries({ queryKey: ['featured-services'] })
			queryClient.invalidateQueries({ queryKey: ['popular-services'] })
			queryClient.invalidateQueries({ queryKey: ['top-freelancers'] })
			setShowForm(false)
			setEditingServiceId(null)
			resetForm()
		},
		onError: (err: unknown) => {
			setFormError(extractApiError(err, 'Ошибка при создании'))
		},
	})

	const { mutate: saveService, isPending: saving } = useMutation({
		mutationFn: ({
			id,
			payload,
		}: {
			id: string
			payload: UpdateServicePayload
		}) => updateService(id, payload),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['my-services', freelancerId] })
			queryClient.invalidateQueries({ queryKey: ['services'] })
			queryClient.invalidateQueries({
				queryKey: ['freelancer-services', freelancerId],
			})
			queryClient.invalidateQueries({ queryKey: ['featured-services'] })
			queryClient.invalidateQueries({ queryKey: ['popular-services'] })
			queryClient.invalidateQueries({ queryKey: ['top-freelancers'] })
			queryClient.invalidateQueries({
				queryKey: ['service', variables.id],
			})
			setShowForm(false)
			setEditingServiceId(null)
			resetForm()
		},
		onError: (err: unknown) => {
			setFormError(extractApiError(err, 'Ошибка при сохранении'))
		},
	})

	function resetForm() {
		setTitle('')
		setDescription('')
		setCategory('informatics')
		setLevel('bachelor')
		setTags('')
		setPackages([
			{
				id: undefined,
				name: 'Базовый',
				price: '',
				deliveryDays: '',
				revisions: '-1',
				description: '',
			},
		])
		setFormError('')
	}

	function fillFormFromService(service: Service) {
		setTitle(service.title)
		setDescription(service.description)
		setCategory(service.category)
		setLevel(service.level)
		setTags(service.tags.join(', '))
		setPackages(
			service.packages.map(pkg => ({
				id: pkg.id,
				name: pkg.name,
				price: String(pkg.price),
				deliveryDays: String(pkg.deliveryDays),
				revisions: String(pkg.revisions ?? 1),
				description: pkg.description ?? '',
			})),
		)
		setFormError('')
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setFormError('')
		if (!title.trim()) return setFormError('Введите название услуги')
		if (!description.trim()) return setFormError('Введите описание')

		const mappedPackages = packages.map(pkg => ({
			id: pkg.id,
			name: pkg.name.trim() || 'Базовый',
			price: Math.round(Number(pkg.price) * 100),
			deliveryDays: Number(pkg.deliveryDays),
			revisions:
				pkg.revisions.trim() === '' || Number.isNaN(Number(pkg.revisions))
					? 1
					: Number(pkg.revisions),
			description: pkg.description.trim() || undefined,
		}))

		if (
			mappedPackages.some(
				pkg => !pkg.price || isNaN(pkg.price) || pkg.price <= 0,
			)
		) {
			return setFormError('Введите корректную цену пакетов')
		}
		if (
			mappedPackages.some(
				pkg =>
					!pkg.deliveryDays || isNaN(pkg.deliveryDays) || pkg.deliveryDays <= 0,
			)
		) {
			return setFormError('Введите корректные сроки по пакетам')
		}

		const payload = {
			title: title.trim(),
			description: description.trim(),
			category: category.toUpperCase(),
			level: level.toUpperCase(),
			tags: tags
				.split(',')
				.map(t => t.trim())
				.filter(Boolean),
			packages: mappedPackages,
		}

		if (editingServiceId) {
			saveService({ id: editingServiceId, payload })
			return
		}

		submitService(payload)
	}

	function updatePackageField(
		index: number,
		field: 'name' | 'price' | 'deliveryDays' | 'revisions' | 'description',
		value: string,
	) {
		setPackages(prev =>
			prev.map((pkg, i) => (i === index ? { ...pkg, [field]: value } : pkg)),
		)
	}

	function addPackage() {
		setPackages(prev =>
			prev.length >= 3
				? prev
				: [
						...prev,
						{
							id: undefined,
							name:
								PACKAGE_LABELS.find(
									label => !prev.some(pkg => pkg.name === label),
								) ?? PACKAGE_LABELS[Math.min(prev.length, 2)],
							price: '',
							deliveryDays: '',
							revisions: '1',
							description: '',
						},
					],
		)
	}

	function removePackage(index: number) {
		setPackages(prev => prev.filter((_, i) => i !== index))
	}

	function handleEditService(service: Service) {
		setEditingServiceId(service.id)
		setShowForm(true)
		fillFormFromService(service)
	}

	return (
		<div className='space-y-4'>
			<div className='glass-card rounded-2xl p-6'>
				<div className='flex items-center justify-between mb-4'>
					<h2 className='font-semibold text-foreground'>Мои услуги</h2>
					{!showForm && (
						<button
							onClick={() => {
								setEditingServiceId(null)
								resetForm()
								setShowForm(true)
							}}
							className='flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium'
						>
							<Plus className='w-4 h-4' />
							Создать услугу
						</button>
					)}
				</div>

				{showForm && (
					<form
						onSubmit={handleSubmit}
						className='mb-6 p-4 rounded-xl border border-border bg-muted/20 space-y-4'
					>
						<div className='flex items-center justify-between'>
							<p className='font-medium text-sm text-foreground'>
								{editingServiceId ? 'Редактирование услуги' : 'Новая услуга'}
							</p>
							<button
								type='button'
								onClick={() => {
									setShowForm(false)
									setEditingServiceId(null)
									resetForm()
								}}
								className='p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground'
							>
								<X className='w-4 h-4' />
							</button>
						</div>

						<div>
							<label className='block text-xs font-medium text-foreground mb-1'>
								Название <span className='text-destructive'>*</span>
							</label>
							<input
								value={title}
								onChange={e => setTitle(e.target.value)}
								maxLength={100}
								placeholder='Написание курсовой по информатике'
								className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
							/>
						</div>

						<div>
							<label className='block text-xs font-medium text-foreground mb-1'>
								Описание <span className='text-destructive'>*</span>
							</label>
							<textarea
								value={description}
								onChange={e => setDescription(e.target.value)}
								rows={3}
								placeholder='Подробно опишите, что вы предлагаете...'
								className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none'
							/>
						</div>

						<div className='grid sm:grid-cols-2 gap-3'>
							<div>
								<label className='block text-xs font-medium text-foreground mb-1'>
									Категория
								</label>
								<select
									value={category}
									onChange={e => setCategory(e.target.value as ServiceCategory)}
									className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
								>
									{CATEGORY_OPTIONS.map(o => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className='block text-xs font-medium text-foreground mb-1'>
									Уровень
								</label>
								<select
									value={level}
									onChange={e => setLevel(e.target.value as ServiceLevel)}
									className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
								>
									{LEVEL_OPTIONS.map(o => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
							</div>
						</div>

						<div>
							<label className='block text-xs font-medium text-foreground mb-1'>
								Теги (через запятую)
							</label>
							<input
								value={tags}
								onChange={e => setTags(e.target.value)}
								placeholder='курсовая, диплом, C++'
								className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
							/>
						</div>

						{/* Packages */}
						<div className='space-y-3'>
							<div className='flex items-center justify-between'>
								<p className='text-xs font-semibold text-foreground'>
									Пакеты услуги
								</p>
								<button
									type='button'
									onClick={addPackage}
									disabled={packages.length >= 3}
									className='text-xs font-medium text-primary disabled:opacity-50 hover:underline'
								>
									+ Добавить пакет
								</button>
							</div>

							{packages.map((pkg, idx) => (
								<div
									key={pkg.id ?? idx}
									className='p-3 rounded-lg border border-dashed border-border space-y-3'
								>
									<div className='flex items-center justify-between'>
										<p className='text-xs font-semibold text-foreground'>
											Пакет {idx + 1}
										</p>
										{!pkg.id && packages.length > 1 && (
											<button
												type='button'
												onClick={() => removePackage(idx)}
												className='text-xs text-destructive hover:underline'
											>
												Удалить
											</button>
										)}
									</div>
									<div className='grid sm:grid-cols-2 gap-3'>
										<div>
											<label className='block text-xs text-muted-foreground mb-1'>
												Название пакета
											</label>
											<input
												value={pkg.name}
												onChange={e =>
													updatePackageField(idx, 'name', e.target.value)
												}
												placeholder='Базовый'
												className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
											/>
										</div>
										<div>
											<label className='block text-xs text-muted-foreground mb-1'>
												Цена (₽) <span className='text-destructive'>*</span>
											</label>
											<input
												type='number'
												min='1'
												value={pkg.price}
												onChange={e =>
													updatePackageField(idx, 'price', e.target.value)
												}
												placeholder='3000'
												className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
											/>
										</div>
										<div>
											<label className='block text-xs text-muted-foreground mb-1'>
												Срок (дней) <span className='text-destructive'>*</span>
											</label>
											<input
												type='number'
												min='1'
												value={pkg.deliveryDays}
												onChange={e =>
													updatePackageField(
														idx,
														'deliveryDays',
														e.target.value,
													)
												}
												placeholder='7'
												className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
											/>
										</div>
										<div>
											<label className='block text-xs text-muted-foreground mb-1'>
												Правок
											</label>
											<input
												type='number'
												min='-1'
												value={pkg.revisions}
												onChange={e =>
													updatePackageField(idx, 'revisions', e.target.value)
												}
												placeholder='-1'
												className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
											/>
											<p className='text-[11px] text-muted-foreground mt-1'>
												-1 = безлимит правок
											</p>
										</div>
									</div>
									<div>
										<label className='block text-xs text-muted-foreground mb-1'>
											Что входит в пакет
										</label>
										<input
											value={pkg.description}
											onChange={e =>
												updatePackageField(idx, 'description', e.target.value)
											}
											placeholder='Базовый объём работы...'
											className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
										/>
									</div>
								</div>
							))}
						</div>

						{formError && (
							<p className='text-xs text-destructive'>{formError}</p>
						)}

						<div className='flex gap-2'>
							<button
								type='submit'
								disabled={creating || saving}
								className='flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors'
							>
								{editingServiceId
									? saving
										? 'Сохраняем...'
										: 'Сохранить изменения'
									: creating
										? 'Создаём...'
										: 'Создать услугу'}
							</button>
							<button
								type='button'
								onClick={() => {
									setShowForm(false)
									setEditingServiceId(null)
									resetForm()
								}}
								className='px-5 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors'
							>
								Отмена
							</button>
						</div>
					</form>
				)}

				{isLoading ? (
					<div className='space-y-3'>
						{[0, 1, 2].map(i => (
							<div
								key={i}
								className='h-16 bg-muted/50 rounded-xl animate-pulse'
							/>
						))}
					</div>
				) : services.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
						<Briefcase className='w-12 h-12 opacity-20 mb-3' />
						<p className='text-sm'>У вас ещё нет услуг</p>
						{!showForm && (
							<button
								onClick={() => {
									setEditingServiceId(null)
									resetForm()
									setShowForm(true)
								}}
								className='mt-4 text-sm text-primary hover:underline'
							>
								Создать первую услугу →
							</button>
						)}
					</div>
				) : (
					<div className='space-y-3'>
						{services.map(service => (
							<ServiceCard
								key={service.id}
								service={service}
								onEdit={handleEditService}
								onDelete={removeService}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
