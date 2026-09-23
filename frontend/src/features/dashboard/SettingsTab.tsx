import {
	requestPasswordChangeApi,
	switchRoleApi,
	updateMeApi,
	updateProfileApi,
	uploadAvatarApi,
} from '@/api/auth'
import { extractApiError } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import type { FreelancerProfile, ServiceCategory } from '@/types'
import { SERVICE_CATEGORIES } from '@/types'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion, useAnimation } from 'framer-motion'
import { Check, KeyRound, Mail } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const AVATAR_BASE_URL =
	(import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? ''
const DEFAULT_AVATARS = (import.meta.env.VITE_DEFAULT_AVATARS ?? '')
	.split(',')
	.map(value => value.trim())
	.filter(Boolean)
	.map(src => {
		if (!src.startsWith('/')) return src
		const base = AVATAR_BASE_URL.replace(/\/$/, '')
		return base ? `${base}${src}` : src
	})

export function SettingsTab() {
	const { user, updateUser } = useAuthStore()
	const queryClient = useQueryClient()
	const normalizeSpecializations = (values?: string[]): ServiceCategory[] =>
		(values ?? [])
			.map(value => value.toLowerCase())
			.filter((value): value is ServiceCategory =>
				Object.prototype.hasOwnProperty.call(SERVICE_CATEGORIES, value),
			)
	const allowedAvatarTypes = ['image/jpeg', 'image/png', 'image/webp']
	const [name, setName] = useState(user?.name ?? '')
	const [bio, setBio] = useState(user?.bio ?? '')
	const [telegram, setTelegram] = useState(user?.telegram ?? '')
	const [avatar, setAvatar] = useState(user?.avatar ?? '')
	const [avatarFile, setAvatarFile] = useState<File | null>(null)
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
	const [avatarError, setAvatarError] = useState('')
	const [specializations, setSpecializations] = useState<ServiceCategory[]>(
		user?.role === 'freelancer'
			? normalizeSpecializations(
					(user as FreelancerProfile).specializations ?? [],
				)
			: [],
	)
	const [saving, setSaving] = useState(false)
	const [saved, setSaved] = useState(false)
	const [error, setError] = useState('')
	const [passwordEmailSending, setPasswordEmailSending] = useState(false)
	const [passwordEmailSent, setPasswordEmailSent] = useState(false)
	const [passwordEmailError, setPasswordEmailError] = useState('')
	const fileInputRef = useRef<HTMLInputElement | null>(null)

	// Role switching state
	const [roleSwitching, setRoleSwitching] = useState(false)
	const [roleConfirm, setRoleConfirm] = useState(false)
	const [roleError, setRoleError] = useState('')

	const isFreelancer = user?.role === 'freelancer'
	const targetRole = isFreelancer ? 'STUDENT' : 'FREELANCER'
	const targetRoleLabel = isFreelancer ? 'Заказчик' : 'Исполнитель'
	const displayAvatar = avatarPreview ?? avatar
	const controls = useAnimation()

	useEffect(() => {
		setName(user?.name ?? '')
		setBio(user?.bio ?? '')
		setTelegram(user?.telegram ?? '')
		setAvatar(user?.avatar ?? '')
		setAvatarFile(null)
		setSpecializations(
			user?.role === 'freelancer'
				? normalizeSpecializations(
						(user as FreelancerProfile).specializations ?? [],
					)
				: [],
		)
	}, [user])

	useEffect(() => {
		if (!avatarFile) {
			setAvatarPreview(null)
			return
		}
		const url = URL.createObjectURL(avatarFile)
		setAvatarPreview(url)
		return () => URL.revokeObjectURL(url)
	}, [avatarFile])

	const handleClick = async (): Promise<void> => {
		await controls.start({
			rotate: [0, 25, -25, 0],
			transition: { duration: 0.5 },
		})
	}

	const handleAvatarFile = (file: File | null) => {
		if (!file) return
		if (!allowedAvatarTypes.includes(file.type)) {
			setAvatarError('Только JPG, PNG или WebP')
			return
		}
		if (file.size > 2 * 1024 * 1024) {
			setAvatarError('Максимальный размер — 2MB')
			return
		}
		setAvatarError('')
		setAvatarFile(file)
	}

	const navigate = useNavigate()
	const handleSwitchRole = async () => {
		setRoleSwitching(true)
		setRoleError('')
		try {
			const updated = await switchRoleApi(targetRole)
			updateUser({
				role: (updated as { role: string }).role as 'student' | 'freelancer',
			})
			setRoleConfirm(false)
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
				queryClient.invalidateQueries({ queryKey: ['my-services'] }),
				queryClient.invalidateQueries({ queryKey: ['my-reviews'] }),
				queryClient.invalidateQueries({ queryKey: ['received-reviews'] }),
			])
			navigate({ to: '/dashboard', search: { tab: 'orders' } })
		} catch (err: unknown) {
			setRoleError(extractApiError(err, 'Не удалось сменить роль'))
		} finally {
			setRoleSwitching(false)
		}
	}

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim()) {
			setError('Никнейм не может быть пустым')
			return
		}
		setError('')
		setSaving(true)
		try {
			let avatarUrl = avatar.trim()
			let uploadedAvatar: string | undefined
			if (avatarFile) {
				const uploaded = await uploadAvatarApi(avatarFile)
				uploadedAvatar = uploaded.avatar
				avatarUrl = uploadedAvatar ?? avatarUrl
			}
			if (avatarUrl && avatarUrl.startsWith('/')) {
				const baseUrl =
					AVATAR_BASE_URL || window.location.origin.replace(/\/$/, '')
				avatarUrl = `${baseUrl}${avatarUrl}`
			}
			await updateMeApi(
				avatarFile
					? { name: name.trim() }
					: { name: name.trim(), avatar: avatarUrl || undefined },
			)
			if (isFreelancer) {
				await updateProfileApi({
					bio: bio.trim() || undefined,
					telegram: telegram.trim() || undefined,
					specializations,
				})
			}
			if (uploadedAvatar) {
				setAvatar(uploadedAvatar)
				setAvatarFile(null)
				setAvatarPreview(null)
			}
			updateUser({
				name: name.trim(),
				avatar: avatarUrl || undefined,
				...(isFreelancer && {
					bio: bio.trim() || undefined,
					telegram: telegram.trim() || undefined,
					specializations,
				}),
			})
			if (user?.id) {
				queryClient.invalidateQueries({ queryKey: ['freelancer', user.id] })
			}
			queryClient.invalidateQueries({ queryKey: ['freelancers'] })
			setSaved(true)
			setTimeout(() => setSaved(false), 3000)
		} catch (err: unknown) {
			setError(extractApiError(err, 'Не удалось сохранить изменения'))
		} finally {
			setSaving(false)
		}
	}

	const handlePasswordChangeRequest = async () => {
		setPasswordEmailSending(true)
		setPasswordEmailError('')
		try {
			await requestPasswordChangeApi()
			setPasswordEmailSent(true)
		} catch (err: unknown) {
			setPasswordEmailError(extractApiError(err, 'Не удалось отправить письмо'))
		} finally {
			setPasswordEmailSending(false)
		}
	}

	return (
		<div className='glass-card rounded-2xl p-6'>
			<div className='flex items-center justify-between gap-3 mb-6'>
				<div>
					<h2 className='font-semibold text-foreground'>Настройки профиля</h2>
					<p className='text-xs text-muted-foreground mt-1'>
						Управляйте аватаром и персональными данными
					</p>
				</div>
				<span className='text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
					Profile
				</span>
			</div>
			<form onSubmit={handleSave} className='space-y-5'>
				<div className='rounded-3xl border border-border/60 bg-gradient-to-br from-white via-primary/5 to-primary/15 p-5 shadow-sm relative overflow-hidden'>
					<div className='absolute -top-12 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl' />
					<div className='absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-primary/15 blur-2xl' />
					<div className='relative space-y-5'>
						<div className='rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm'>
							<p className='block text-sm font-medium text-foreground mb-3'>
								Аватар
							</p>
							<div className='flex items-center gap-4'>
								<div className='w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden text-lg font-semibold text-muted-foreground ring-2 ring-primary/10'>
									{displayAvatar ? (
										<img
											src={displayAvatar}
											alt={name || 'Аватар'}
											className='w-full h-full object-cover'
										/>
									) : (
										(name || '?').charAt(0).toUpperCase()
									)}
								</div>
								<div className='flex flex-wrap gap-2'>
									<button
										type='button'
										onClick={() => fileInputRef.current?.click()}
										className='px-3 py-2 rounded-xl border border-border/60 text-sm hover:bg-muted transition-colors'
									>
										Выбрать файл
									</button>
									<button
										type='button'
										onClick={() => {
											setAvatar('')
											setAvatarFile(null)
											setAvatarPreview(null)
											setAvatarError('')
										}}
										className='px-3 py-2 rounded-xl border border-border/60 text-sm text-muted-foreground hover:bg-muted transition-colors'
									>
										Сбросить
									</button>
								</div>
							</div>
							<input
								ref={fileInputRef}
								type='file'
								accept='image/jpeg,image/png,image/webp'
								className='hidden'
								onChange={e => {
									handleAvatarFile(e.target.files?.[0] ?? null)
									e.target.value = ''
								}}
							/>
							<p className='text-xs text-muted-foreground mt-2'>
								JPG, PNG или WebP, до 2MB
							</p>
							{avatarError && (
								<p className='text-xs text-destructive mt-1'>{avatarError}</p>
							)}
						</div>

						{DEFAULT_AVATARS.length > 0 && (
							<div className='rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm'>
								<p className='block text-sm font-medium text-foreground mb-2'>
									Выбрать из коллекции
								</p>
								<div className='grid grid-cols-3 gap-2'>
									{DEFAULT_AVATARS.map(src => (
										<button
											key={src}
											type='button'
											onClick={() => {
												setAvatar(src)
												setAvatarFile(null)
												setAvatarPreview(null)
												setAvatarError('')
											}}
											className='w-12 h-12 rounded-full overflow-hidden border border-border hover:border-primary/60 transition-colors'
											aria-label='Выбрать аватар'
										>
											<img src={src} alt='' className='w-full h-full' />
										</button>
									))}
								</div>
							</div>
						)}
						<div className='rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm'>
							<label
								htmlFor='settings-name'
								className='block text-sm font-medium text-foreground mb-1.5'
							>
								Никнейм
							</label>
							<input
								id='settings-name'
								name='name'
								type='text'
								value={name}
								onChange={e => setName(e.target.value)}
								className='w-full px-3 py-2.5 rounded-xl border border-border/60 bg-background/70 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition'
								placeholder='Ваш никнейм'
								autoComplete='name'
							/>
						</div>

						{isFreelancer && (
							<>
								<div className='rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm'>
									<label
										htmlFor='settings-bio'
										className='block text-sm font-medium text-foreground mb-1.5'
									>
										О себе
									</label>
									<textarea
										id='settings-bio'
										name='bio'
										value={bio}
										onChange={e => setBio(e.target.value)}
										rows={3}
										maxLength={500}
										className='w-full px-3 py-2.5 rounded-xl border border-border/60 bg-background/70 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition resize-none'
										placeholder='Расскажите о своём опыте...'
									/>
									<p className='text-xs text-muted-foreground mt-1 text-right'>
										{bio.length}/500
									</p>
								</div>

								<div className='rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm'>
									<label
										htmlFor='settings-telegram'
										className='block text-sm font-medium text-foreground mb-1.5'
									>
										Telegram
									</label>
									<input
										id='settings-telegram'
										name='telegram'
										type='text'
										value={telegram}
										onChange={e => setTelegram(e.target.value)}
										className='w-full px-3 py-2.5 rounded-xl border border-border/60 bg-background/70 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition'
										placeholder='@username'
									/>
								</div>

								<div className='rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm'>
									<p className='block text-sm font-medium text-foreground mb-2'>
										Специализации
									</p>
									<div className='grid sm:grid-cols-2 gap-2'>
										{Object.entries(SERVICE_CATEGORIES).map(
											([value, label]) => {
												const spec = value as ServiceCategory
												const checked = specializations.includes(spec)
												return (
													<label
														key={spec}
														className='flex items-center gap-2 text-sm text-foreground'
													>
														<input
															type='checkbox'
															checked={checked}
															onChange={() => {
																setSpecializations(prev =>
																	checked
																		? prev.filter(item => item !== spec)
																		: [...prev, spec],
																)
															}}
															className='h-4 w-4 rounded border-border/70 text-primary focus:ring-primary/60'
														/>
														<span>{label}</span>
													</label>
												)
											},
										)}
									</div>
								</div>
							</>
						)}

						{error && <p className='text-xs text-destructive'>{error}</p>}
					</div>
				</div>

				<motion.button
					type='submit'
					disabled={saving}
					animate={controls}
					onClick={handleClick}
					className='flex items-center gap-2 my-10 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 cursor-pointer disabled:opacity-60 transition-colors'
				>
					{saved ? (
						<>
							<Check className='w-4 h-4' /> Сохранено
						</>
					) : saving ? (
						'Сохранение...'
					) : (
						'Сохранить изменения'
					)}
				</motion.button>
			</form>

			<div className='mt-8 pt-6 border-t border-border'>
				<div className='flex items-center justify-between gap-4 mb-3'>
					<div>
						<h3 className='font-semibold text-foreground'>Пароль</h3>
						<p className='text-xs text-muted-foreground mt-1'>
							Безопасная смена через подтверждение по email
						</p>
					</div>
					<KeyRound className='h-5 w-5 text-muted-foreground' />
				</div>
				<div className='rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm'>
					<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
						<div className='min-w-0'>
							<p className='text-sm font-medium text-foreground flex items-center gap-2'>
								<Mail className='h-4 w-4 text-primary' />
								{user?.email}
							</p>
							<p className='text-xs text-muted-foreground mt-1'>
								Мы пришлём одноразовую ссылку, действующую 1 час.
							</p>
						</div>
						<button
							type='button'
							onClick={handlePasswordChangeRequest}
							disabled={passwordEmailSending || passwordEmailSent}
							className='shrink-0 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 disabled:opacity-60 transition-colors'
						>
							{passwordEmailSending
								? 'Отправляем...'
								: passwordEmailSent
									? 'Письмо отправлено'
									: 'Сменить пароль'}
						</button>
					</div>
					{passwordEmailSent && (
						<p className='text-xs text-green-600 mt-3'>
							Проверьте почту и перейдите по ссылке из письма.
						</p>
					)}
					{passwordEmailError && (
						<p className='text-xs text-destructive mt-3'>
							{passwordEmailError}
						</p>
					)}
				</div>
			</div>

			{/* Role switch section */}
			<div className='mt-8 pt-6 border-t border-border'>
				<div className='flex items-center justify-between gap-4 mb-3'>
					<div>
						<h3 className='font-semibold text-foreground'>Роль аккаунта</h3>
						<p className='text-xs text-muted-foreground mt-1'>
							Выберите режим работы профиля
						</p>
					</div>
					<span className='text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
						Role
					</span>
				</div>
				<div className='rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm'>
					<div className='relative grid grid-cols-2 gap-1 rounded-full border border-border/60 bg-muted/40 p-1 text-xs font-medium text-muted-foreground'>
						<div
							className={`absolute top-1 left-1 h-[calc(100%-0.5rem)] w-[calc(50%-0.25rem)] rounded-full bg-primary/20 transition-transform duration-200 ${
								isFreelancer ? 'translate-x-full' : ''
							}`}
						/>
						<button
							type='button'
							onClick={() => {
								if (isFreelancer) {
									setRoleConfirm(true)
								} else {
									setRoleConfirm(false)
									setRoleError('')
								}
							}}
							className={`relative z-10 rounded-full py-2 transition-colors ${
								!isFreelancer ? 'text-foreground' : 'text-muted-foreground'
							}`}
						>
							Заказчик
						</button>
						<button
							type='button'
							onClick={() => {
								if (!isFreelancer) {
									setRoleConfirm(true)
								} else {
									setRoleConfirm(false)
									setRoleError('')
								}
							}}
							className={`relative z-10 rounded-full py-2 transition-colors ${
								isFreelancer ? 'text-foreground' : 'text-muted-foreground'
							}`}
						>
							Исполнитель
						</button>
					</div>
					<p className='text-xs text-muted-foreground mt-3'>
						Сейчас активен режим{' '}
						<span className='font-medium text-foreground'>
							{isFreelancer ? 'Исполнитель' : 'Заказчик'}
						</span>
						. Переключение применится после подтверждения.
					</p>

					{roleConfirm && (
						<div className='mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3'>
							<p className='text-sm text-foreground'>
								⚠️{' '}
								{isFreelancer
									? 'После смены роли ваши услуги будут недоступны для новых заказов. Профиль исполнителя сохранится — вы сможете вернуться обратно.'
									: 'После смены роли вы сможете создавать услуги и принимать заказы как исполнитель.'}
							</p>
							{roleError && (
								<p className='text-xs text-destructive'>{roleError}</p>
							)}
							<div className='flex gap-2'>
								<button
									type='button'
									onClick={handleSwitchRole}
									disabled={roleSwitching}
									className='px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors'
								>
									{roleSwitching
										? 'Переключаем...'
										: `Да, стать ${targetRoleLabel}`}
								</button>
								<button
									type='button'
									onClick={() => {
										setRoleConfirm(false)
										setRoleError('')
									}}
									disabled={roleSwitching}
									className='px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted disabled:opacity-60 transition-colors'
								>
									Отмена
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
