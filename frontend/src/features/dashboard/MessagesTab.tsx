import {
	findOrCreateConversation,
	getConversations,
	getUnreadCounts,
} from '@/api/chat'
import { extractApiError } from '@/api/client'
import StatePanel from '@/components/common/StatePanel'
import { useChatNotifications } from '@/hooks/useChatNotifications'
import { acquireChatSocket, releaseChatSocket } from '@/lib/chatSocket'
import { truncate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MessageCircle, MessageSquare } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { InlineChatContent } from './InlineChatContent'

export function MessagesTab({
	currentUserId,
	initialPartnerId,
}: {
	currentUserId: string
	initialPartnerId?: string
}) {
	useChatNotifications(true)
	const queryClient = useQueryClient()
	const token = useAuthStore(s => s.token)
	const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({})
	const presenceSocketRef = useRef<Socket | null>(null)
	const partnerIdsRef = useRef<string[]>([])

	const {
		data: conversations = [],
		isLoading,
		isError,
		isFetching,
		refetch,
	} = useQuery({
		queryKey: ['conversations'],
		queryFn: getConversations,
		refetchInterval: 15000,
	})

	useEffect(() => {
		queryClient.invalidateQueries({ queryKey: ['conversations'] })
		queryClient.invalidateQueries({ queryKey: ['unread-counts'] })
	}, [queryClient])

	const { data: unreadCounts = {} } = useQuery({
		queryKey: ['unread-counts'],
		queryFn: getUnreadCounts,
		refetchInterval: 15000,
	})

	useEffect(() => {
		partnerIdsRef.current = conversations
			.map(conv => conv.partner.id)
			.filter(Boolean)
	}, [conversations])

	useEffect(() => {
		if (!token) return
		const socket = acquireChatSocket(token)
		presenceSocketRef.current = socket
		if (!socket) return

		const emitSnapshotRequest = () => {
			const ids = partnerIdsRef.current
			socket.emit('subscribePresence', { userIds: ids, scope: 'list' })
		}

		const onPresenceUpdate = (payload: { userId: string; online: boolean }) => {
			setPresenceMap(prev => ({ ...prev, [payload.userId]: payload.online }))
		}

		socket.on('connect', emitSnapshotRequest)
		socket.on('presenceUpdate', onPresenceUpdate)
		socket.on('presenceSnapshot', onPresenceUpdate)

		if (socket.connected) emitSnapshotRequest()

		return () => {
			socket.off('connect', emitSnapshotRequest)
			socket.off('presenceUpdate', onPresenceUpdate)
			socket.off('presenceSnapshot', onPresenceUpdate)
			releaseChatSocket(socket)
			if (presenceSocketRef.current === socket) {
				presenceSocketRef.current = null
			}
		}
	}, [token])

	useEffect(() => {
		const socket = presenceSocketRef.current
		if (!socket?.connected) return
		const ids = partnerIdsRef.current
		socket.emit('subscribePresence', { userIds: ids, scope: 'list' })
	}, [conversations])

	const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
	const [openError, setOpenError] = useState('')
	const hasSelection = Boolean(selectedConvId)
	const lastPartnerIdRef = useRef<string | undefined>(undefined)

	// When coming from "Написать" button — auto-find/create conversation
	useEffect(() => {
		if (!initialPartnerId || lastPartnerIdRef.current === initialPartnerId) {
			return
		}
		lastPartnerIdRef.current = initialPartnerId
		findOrCreateConversation(initialPartnerId)
			.then(conv => {
				setOpenError('')
				setSelectedConvId(conv.id)
				void queryClient.invalidateQueries({ queryKey: ['conversations'] })
			})
			.catch((error: unknown) => {
				setOpenError(extractApiError(error, 'Не удалось открыть диалог'))
			})
	}, [initialPartnerId, queryClient])

	const selectedConv = conversations.find(c => c.id === selectedConvId)
	const selectedPartnerOnline = selectedConv?.partner.id
		? Boolean(presenceMap[selectedConv.partner.id])
		: false

	return (
		<div className='space-y-3'>
			{openError && (
				<div role='alert' className='flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
					<span>{openError}</span>
					<button type='button' onClick={() => setOpenError('')} className='font-medium hover:underline'>
						Закрыть
					</button>
				</div>
			)}
			<div className='glass-card rounded-2xl overflow-hidden min-w-0'>
			<div
				className={`flex flex-col sm:flex-row min-w-0 overflow-x-hidden ${
					hasSelection
						? 'h-[92vh] sm:h-[92vh] lg:h-[92vh]'
						: 'h-auto sm:h-[92vh] lg:h-[92vh]'
				}`}
			>
				{/* Sidebar — conversations list */}
				<div
					className={`w-full sm:w-64 shrink-0 border-border flex flex-col min-w-0 overflow-x-hidden ${
						hasSelection ? 'hidden sm:flex' : 'flex'
					} sm:border-r`}
				>
					<div className='flex items-center gap-2 px-4 py-3 border-b border-border'>
						<MessageSquare className='w-4 h-4 text-primary' />
						<span className='text-sm font-semibold text-foreground'>
							Сообщения
						</span>
					</div>

					<div className='flex-1 overflow-y-auto overflow-x-hidden'>
						{isLoading ? (
							<div className='space-y-1 p-2'>
								{[0, 1, 2].map(i => (
									<div
										key={i}
										className='h-14 rounded-xl bg-muted/50 animate-pulse'
									/>
								))}
							</div>
						) : isError ? (
							<div className='p-3'>
								<StatePanel
									compact
									title='Не удалось загрузить сообщения'
									onRetry={() => void refetch()}
									retrying={isFetching}
								/>
							</div>
						) : conversations.length === 0 ? (
							<div className='flex flex-col items-center justify-center h-full text-muted-foreground p-4'>
								<MessageCircle className='w-8 h-8 opacity-20 mb-2' />
								<p className='text-xs text-center'>Переписок пока нет</p>
							</div>
						) : (
							<div className='p-2 space-y-0.5 min-w-0'>
								{conversations.map(conv => {
									const unread = unreadCounts[conv.id] ?? 0
									const isSelected = selectedConvId === conv.id
									const isOnline = Boolean(presenceMap[conv.partner.id])
									return (
										<button
											key={conv.id}
											onClick={() => setSelectedConvId(conv.id)}
											className={`w-full min-w-0 text-left px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3 ${
												isSelected
													? 'bg-primary/10 text-primary'
													: 'text-foreground hover:bg-muted/50'
											}`}
										>
											<div className='relative w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden'>
												{conv.partner.avatar ? (
													<img
														src={conv.partner.avatar}
														alt={conv.partner.name}
														className='w-full h-full object-cover'
													/>
												) : (
													conv.partner.name.charAt(0).toUpperCase()
												)}
												{isOnline && (
													<span className='absolute bottom-[3px] right-[3px] w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background' />
												)}
											</div>
											<div className='flex-1 min-w-0'>
												<p className='text-xs font-medium truncate'>
													{conv.partner.name}
												</p>
												{conv.lastMessage && (
													<p className='text-[10px] text-muted-foreground truncate'>
														{conv.lastMessage.senderId === currentUserId
															? 'Вы: '
															: ''}
														{truncate(
															conv.lastMessage.content?.trim() ||
																(conv.lastMessage.attachmentName
																	? `Файл: ${conv.lastMessage.attachmentName}`
																	: 'Файл'),
															32,
														)}
													</p>
												)}
											</div>
											{unread > 0 && (
												<span className='shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold'>
													{unread > 9 ? '9+' : unread}
												</span>
											)}
										</button>
									)
								})}
							</div>
						)}
					</div>
				</div>

				{/* Chat area */}
				<div
					className={`flex-1 flex flex-col min-w-0 min-h-0 ${
						hasSelection ? 'flex' : 'hidden sm:flex'
					}`}
				>
					{selectedConvId ? (
						<div className='flex-1 flex flex-col min-h-0'>
							{/* Chat header */}
							<div className='flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 sticky top-0 z-10 bg-background/90 backdrop-blur sm:static'>
								<button
									type='button'
									onClick={() => setSelectedConvId(null)}
									className='sm:hidden -ml-1 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition'
									aria-label='Назад к списку'
								>
									<ArrowLeft className='w-4 h-4' />
								</button>
								<div className='relative w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold overflow-hidden shrink-0'>
									{selectedConv?.partner.avatar ? (
										<img
											src={selectedConv.partner.avatar}
											alt={selectedConv.partner.name}
											className='w-full h-full object-cover'
										/>
									) : (
										(selectedConv?.partner.name ?? '?').charAt(0).toUpperCase()
									)}
									{selectedPartnerOnline && (
										<span className='absolute bottom-[3px] right-[3px] w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background' />
									)}
								</div>
								<div>
									<p className='text-sm font-medium text-foreground'>
										{selectedConv?.partner.name ?? 'Пользователь'}
									</p>
									<p className='text-xs text-muted-foreground'>
										Личные сообщения
									</p>
								</div>
							</div>

							<InlineChatContent
								conversationId={selectedConvId}
								currentUserId={currentUserId}
								partnerId={selectedConv?.partner.id}
							/>
						</div>
					) : (
						<div className='flex-1 flex flex-col items-center justify-center text-muted-foreground'>
							<MessageCircle className='w-12 h-12 opacity-20 mb-3' />
							<p className='text-sm font-medium text-foreground'>
								Выберите диалог
							</p>
							<p className='text-xs mt-1'>Переписки доступны слева</p>
						</div>
					)}
				</div>
			</div>
			</div>
		</div>
	)
}
