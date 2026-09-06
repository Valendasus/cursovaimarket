import type { DirectMessage } from '@/api/chat'
import { useChatSocket } from '@/hooks/useChatSocket'
import { formatFileSize, truncate } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
	FileText,
	Loader2,
	MessageCircle,
	Paperclip,
	Send,
	Wifi,
	WifiOff,
	X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ChatPaneProps {
	/** Conversation id (userA↔userB pair, created automatically) */
	conversationId: string
	currentUserId: string
	partnerId?: string
	isOpen: boolean
	/** Called when the pane becomes visible so we can mark messages as read */
	onOpen?: () => void
}

function MessageBubble({
	msg,
	isMine,
	retryMessage,
}: {
	msg: DirectMessage
	isMine: boolean
	retryMessage: (clientMessageId: string) => void
}) {
	const time = new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit',
	})
	const isImage = Boolean(msg.attachmentType?.startsWith('image/'))
	const isPending = msg.localStatus === 'pending'
	const isFailed = msg.localStatus === 'failed'

	return (
		<div
			className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
		>
			{/* Avatar */}
			{!isMine && (
				<div className='w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden'>
					{msg.sender.avatar ? (
						<img
							src={msg.sender.avatar}
							alt={msg.sender.name}
							className='w-full h-full object-cover'
						/>
					) : (
						msg.sender.name.charAt(0).toUpperCase()
					)}
				</div>
			)}

			{/* Bubble */}
			<div
				className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}
			>
				{!isMine && (
					<span className='text-[10px] text-muted-foreground px-1'>
						{msg.sender.name}
					</span>
				)}
				{msg.attachmentUrl && (
					<a
						href={msg.attachmentUrl}
						target='_blank'
						rel='noreferrer'
						className={`overflow-hidden rounded-2xl border border-white/10 ${
							isImage
								? 'bg-black/30'
								: isMine
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-foreground'
						} ${isPending ? 'opacity-70' : ''}`}
					>
						{isImage ? (
							<img
								src={msg.attachmentUrl}
								alt={msg.attachmentName ?? 'Изображение'}
								className='max-h-64 w-full object-cover'
							/>
						) : (
							<div className='flex items-center gap-3 px-3 py-2 text-sm'>
								<div className='h-9 w-9 rounded-xl bg-black/20 flex items-center justify-center'>
									<FileText className='h-4 w-4 text-white' />
								</div>
								<div className='min-w-0'>
									<p className='font-medium truncate'>
										{truncate(msg.attachmentName ?? 'Файл', 15)}
									</p>
									{typeof msg.attachmentSize === 'number' && (
										<p className='text-[10px] opacity-80'>
											{formatFileSize(msg.attachmentSize)}
										</p>
									)}
								</div>
							</div>
						)}
					</a>
				)}
				{msg.content && msg.content.trim() && (
					<div
						className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-all whitespace-pre-wrap ${
							isMine
								? 'bg-primary text-primary-foreground rounded-br-sm'
								: 'bg-muted text-foreground rounded-bl-sm'
						} ${isPending ? 'opacity-70' : ''}`}
					>
						{msg.content}
					</div>
				)}
				<span
					className={`text-[10px] px-1 ${
						isPending || isFailed ? 'text-white/60' : 'text-white'
					} ${isMine ? 'text-right' : 'text-left'}`}
				>
					{time}
					{isMine && (
						<span className='ml-1 text-white'>
							{isPending ? '...' : isFailed ? '!' : msg.isRead ? '✓✓' : '✓'}
						</span>
					)}
				</span>
				{isMine && isFailed && (
					<button
						onClick={() =>
							msg.clientMessageId && retryMessage(msg.clientMessageId)
						}
						className='text-[10px] text-destructive hover:underline'
						type='button'
					>
						Повторить
					</button>
				)}
			</div>
		</div>
	)
}

function StatusBar({ status }: { status: string }) {
	if (status === 'connected') return null
	return (
		<div className='flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted/80 border-b border-border'>
			{status === 'connecting' && (
				<>
					<Loader2 className='w-3 h-3 animate-spin text-primary' />
					<span className='text-muted-foreground'>Подключение...</span>
				</>
			)}
			{status === 'error' && (
				<>
					<WifiOff className='w-3 h-3 text-destructive' />
					<span className='text-destructive'>
						Ошибка соединения · отправка через HTTP
					</span>
				</>
			)}
			{status === 'idle' && (
				<>
					<Wifi className='w-3 h-3 text-muted-foreground' />
					<span className='text-muted-foreground'>Не подключено</span>
				</>
			)}
		</div>
	)
}

export default function ChatPane({
	conversationId,
	currentUserId,
	partnerId,
	isOpen,
	onOpen,
}: ChatPaneProps) {
	const [input, setInput] = useState('')
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [fileError, setFileError] = useState('')
	const [sending, setSending] = useState(false)
	const bottomRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const fileRef = useRef<HTMLInputElement>(null)
	const canSend = Boolean(input.trim() || selectedFile)
	const maxInputHeight = 116
	const typingTimeoutRef = useRef<number | null>(null)

	const resizeInput = () => {
		const el = inputRef.current
		if (!el) return
		el.style.height = 'auto'
		const nextHeight = Math.min(el.scrollHeight, maxInputHeight)
		el.style.height = `${nextHeight}px`
		el.style.overflowY = el.scrollHeight > maxInputHeight ? 'auto' : 'hidden'
	}

	const {
		messages,
		status,
		sendMessage,
		retryMessage,
		markRead,
		setTyping,
		isPartnerOnline,
		isPartnerTyping,
		sendError,
		sendBlocked,
	} = useChatSocket({
		conversationId,
		partnerId,
		enabled: isOpen,
	})

	// Scroll to bottom on new messages
	useEffect(() => {
		if (isOpen && messages.length > 0) {
			bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
		}
	}, [messages, isOpen])

	// Focus input and mark as read when opened
	useEffect(() => {
		if (isOpen) {
			setTimeout(() => inputRef.current?.focus(), 100)
			markRead()
			onOpen?.()
		}
	}, [isOpen, markRead, onOpen])

	useEffect(() => {
		resizeInput()
	}, [input])

	const handleSend = async () => {
		const trimmed = input.trim()
		if (!canSend || sending || sendBlocked) return
		setSending(true)
		setInput('')
		try {
			setTyping(false)
			await sendMessage({
				content: trimmed || undefined,
				file: selectedFile ?? undefined,
			})
			setSelectedFile(null)
			setFileError('')
		} finally {
			setSending(false)
			inputRef.current?.focus()
		}
	}

	useEffect(() => {
		if (!partnerId) return
		const hasText = input.trim().length > 0
		if (!hasText) {
			setTyping(false)
			if (typingTimeoutRef.current) {
				window.clearTimeout(typingTimeoutRef.current)
				typingTimeoutRef.current = null
			}
			return
		}
		setTyping(true)
		if (typingTimeoutRef.current) {
			window.clearTimeout(typingTimeoutRef.current)
		}
		typingTimeoutRef.current = window.setTimeout(() => {
			setTyping(false)
			typingTimeoutRef.current = null
		}, 2000)
	}, [input, partnerId, setTyping])

	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				window.clearTimeout(typingTimeoutRef.current)
				typingTimeoutRef.current = null
			}
		}
	}, [])

	const handleFilePick = (file: File | null) => {
		if (!file) return
		if (file.size > 20 * 1024 * 1024) {
			setFileError('Максимальный размер файла — 20MB')
			return
		}
		setFileError('')
		setSelectedFile(file)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			void handleSend()
		}
	}

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					transition={{ duration: 0.25, ease: 'easeInOut' }}
					className='overflow-hidden'
				>
					<div className='mt-3 border border-border rounded-xl overflow-hidden bg-background/60 backdrop-blur-sm'>
						{/* Header */}
						<div className='flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30'>
							<MessageCircle className='w-3.5 h-3.5 text-primary' />
							<span className='text-xs font-medium text-foreground'>
								Личные сообщения
							</span>
							{status === 'connected' && (
								<span className='ml-auto flex items-center gap-1 text-[10px] text-green-600'>
									<span className='w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse' />
									онлайн
								</span>
							)}
						</div>

						{/* Status bar */}
						<StatusBar status={status} />
						{partnerId && (
							<div className='flex items-center gap-1.5 px-3 py-1 text-[11px] text-muted-foreground border-b border-border bg-muted/20'>
								{isPartnerTyping
									? 'набирает сообщение...'
									: isPartnerOnline === null
										? 'Личные сообщения'
										: isPartnerOnline
											? 'в сети'
											: 'не в сети'}
							</div>
						)}

						{/* Messages */}
						<div className='flex flex-col gap-3 p-3 h-[70vh] sm:h-[70vh] lg:h-[70vh] overflow-y-auto scroll-smooth chat-wallpaper'>
							{messages.length === 0 ? (
								<div className='flex-1 flex flex-col items-center justify-center text-muted-foreground py-8'>
									<MessageCircle className='w-8 h-8 opacity-20 mb-2' />
									<p className='text-xs'>Начните общение</p>
								</div>
							) : (
								messages.map(msg => (
									<MessageBubble
										key={msg.id}
										msg={msg}
										isMine={msg.senderId === currentUserId}
										retryMessage={retryMessage}
									/>
								))
							)}
							<div ref={bottomRef} />
						</div>

						{/* Input */}
						<div className='border-t border-border p-2 flex items-end gap-2'>
							<input
								ref={fileRef}
								type='file'
								className='hidden'
								onChange={e => {
									handleFilePick(e.target.files?.[0] ?? null)
									e.target.value = ''
								}}
							/>
							<button
								type='button'
								onClick={() => fileRef.current?.click()}
								className='shrink-0 w-9 h-9 rounded-xl border border-border bg-muted/30 text-muted-foreground flex items-center justify-center hover:bg-muted/60 hover:text-foreground transition'
								title='Прикрепить файл'
							>
								<Paperclip className='w-4 h-4' />
							</button>
							<textarea
								ref={inputRef}
								value={input}
								onChange={e => setInput(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder='Напишите сообщение... (Enter — отправить)'
								rows={1}
								maxLength={2000}
								className='flex-1 resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[38px] leading-5'
							/>
							<button
								onClick={() => void handleSend()}
								disabled={!canSend || sending || sendBlocked}
								className='shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95'
								title='Отправить (Enter)'
							>
								{sending ? (
									<Loader2 className='w-4 h-4 animate-spin' />
								) : (
									<Send className='w-4 h-4' />
								)}
							</button>
						</div>
						{sendError && (
							<div className='px-3 pb-2 text-[11px] text-destructive'>
								{sendError}
							</div>
						)}
						{(selectedFile || fileError) && (
							<div className='px-2 pb-2 flex items-center gap-2 text-xs text-muted-foreground'>
								{selectedFile && (
									<div className='flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-1'>
										<span className='max-w-[220px] truncate'>
											{selectedFile.name}
										</span>
										<span className='opacity-70'>
											{formatFileSize(selectedFile.size)}
										</span>
										<button
											type='button'
											onClick={() => setSelectedFile(null)}
											className='text-muted-foreground hover:text-foreground'
											title='Убрать файл'
										>
											<X className='w-3 h-3' />
										</button>
									</div>
								)}
								{fileError && (
									<span className='text-destructive'>{fileError}</span>
								)}
							</div>
						)}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
