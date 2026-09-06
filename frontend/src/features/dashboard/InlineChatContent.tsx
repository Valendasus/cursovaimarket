import { useChatSocket } from '@/hooks/useChatSocket'
import { formatFileSize, truncate } from '@/lib/utils'
import {
	FileText,
	Loader2,
	MessageCircle,
	Paperclip,
	Send,
	WifiOff,
	X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const MAX_CHAT_FILE_SIZE = 20 * 1024 * 1024

function isImageAttachment(type?: string | null) {
	return Boolean(type && type.startsWith('image/'))
}

/** Inner chat content used by MessagesTab (messages list + input) */
export function InlineChatContent({
	conversationId,
	currentUserId,
	partnerId,
}: {
	conversationId: string
	currentUserId: string
	partnerId?: string
}) {
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
		enabled: true,
	})
	const [input, setInput] = useState('')
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [fileError, setFileError] = useState('')
	const [sending, setSending] = useState(false)
	const scrollRef = useRef<HTMLDivElement | null>(null)
	const inputRef = useRef<HTMLTextAreaElement | null>(null)
	const fileRef = useRef<HTMLInputElement | null>(null)
	const typingTimeoutRef = useRef<number | null>(null)
	const canSend = Boolean(input.trim() || selectedFile)
	const maxInputHeight = 116

	const resizeInput = () => {
		const el = inputRef.current
		if (!el) return
		el.style.height = 'auto'
		const nextHeight = Math.min(el.scrollHeight, maxInputHeight)
		el.style.height = `${nextHeight}px`
		el.style.overflowY = el.scrollHeight > maxInputHeight ? 'auto' : 'hidden'
	}

	useEffect(() => {
		markRead()
	}, [markRead, conversationId])

	useEffect(() => {
		const el = scrollRef.current
		if (el) el.scrollTop = el.scrollHeight
	}, [messages])

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
		if (file.size > MAX_CHAT_FILE_SIZE) {
			setFileError('Максимальный размер файла — 20MB')
			return
		}
		setFileError('')
		setSelectedFile(file)
	}

	return (
		<div className='flex-1 flex flex-col min-h-0'>
			{/* Status indicator */}
			{status !== 'connected' && (
				<div className='flex items-center gap-1.5 px-4 py-1.5 text-xs bg-muted/50 border-b border-border'>
					{status === 'connecting' && (
						<>
							<Loader2 className='w-3 h-3 animate-spin text-primary' />
							<span className='text-muted-foreground'>Подключение...</span>
						</>
					)}
					{(status === 'error' || status === 'idle') && (
						<>
							<WifiOff className='w-3 h-3 text-destructive' />
							<span className='text-destructive'>Нет соединения</span>
						</>
					)}
				</div>
			)}
			{partnerId && (
				<div className='flex items-center gap-1.5 px-4 py-1 text-[11px] text-muted-foreground border-b border-border bg-muted/30'>
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
			<div
				ref={scrollRef}
				className='flex-1 overflow-y-auto p-4 space-y-3 chat-wallpaper'
			>
				{messages.length === 0 ? (
					<div className='flex flex-col items-center justify-center h-full text-white'>
						<MessageCircle className='w-8 h-8 mb-2' />
						<p className='text-xs'>Сообщений пока нет</p>
					</div>
				) : (
					messages.map(msg => {
						const isMine = msg.senderId === currentUserId
						const time = new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
							hour: '2-digit',
							minute: '2-digit',
						})
						const isPending = msg.localStatus === 'pending'
						const isFailed = msg.localStatus === 'failed'
						return (
							<div
								key={msg.id}
								className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
							>
								{!isMine && (
									<div className='w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden'>
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
								<div
									className={`max-w-[70%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}
								>
									{msg.attachmentUrl && (
										<a
											href={msg.attachmentUrl}
											target='_blank'
											rel='noreferrer'
											className={`overflow-hidden rounded-2xl border border-white/10 ${
												isImageAttachment(msg.attachmentType)
													? 'bg-black/30'
													: isMine
														? 'bg-primary text-primary-foreground'
														: 'bg-muted text-foreground'
											} ${isPending ? 'opacity-70' : ''}`}
										>
											{isImageAttachment(msg.attachmentType) ? (
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
										}`}
									>
										{time}
										{isMine && (
											<span className='ml-1 text-white'>
												{isPending
													? '...'
													: isFailed
														? '!'
														: msg.isRead
															? '✓✓'
															: '✓'}
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
					})
				)}
			</div>

			{/* Input */}
			<div className='shrink-0 border-t border-border p-3 flex items-end gap-2 sticky bottom-0 bg-background/90 backdrop-blur sm:static'>
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
					onKeyDown={e => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							void handleSend()
						}
					}}
					placeholder='Напишите сообщение...'
					rows={1}
					maxLength={2000}
					className='flex-1 resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[38px] leading-5'
				/>
				<button
					onClick={() => void handleSend()}
					disabled={!canSend || sending || sendBlocked}
					className='shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-95'
				>
					{sending ? (
						<Loader2 className='w-4 h-4 animate-spin' />
					) : (
						<Send className='w-4 h-4' />
					)}
				</button>
			</div>
			{(selectedFile || fileError || sendError) && (
				<div className='px-3 pb-3 flex items-center gap-2 text-xs text-muted-foreground'>
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
					{fileError && <span className='text-destructive'>{fileError}</span>}
					{sendError && <span className='text-destructive'>{sendError}</span>}
				</div>
			)}
		</div>
	)
}
