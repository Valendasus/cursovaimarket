import { Link } from '@tanstack/react-router'
import { BookOpen, Github, Mail } from 'lucide-react'

const footerLinks = {
	platform: {
		title: 'Платформа',
		links: [
			{ label: 'Все услуги', href: '/services' },
			{ label: 'Как это работает', href: '/#how-it-works' },
			{ label: 'Стать исполнителем', href: '/register' },
		],
	},
	categories: {
		title: 'Категории',
		links: [
			{ label: 'Экономика', href: '/services?category=economics' },
			{ label: 'Информатика', href: '/services?category=informatics' },
			{ label: 'Юриспруденция', href: '/services?category=law' },
			{ label: 'Математика', href: '/services?category=mathematics' },
		],
	},
	support: {
		title: 'Поддержка',
		links: [
			{ label: 'Центр поддержки', href: '/support' },
			{ label: 'Контакты', href: '/contacts' },
			{ label: 'Правила сервиса', href: '/rules' },
			{ label: 'Правила споров', href: '/disputes' },
			{ label: 'Пользовательское соглашение', href: '/terms' },
			{ label: 'Конфиденциальность', href: '/privacy' },
		],
	},
}

export default function Footer() {
	return (
		<footer className='border-t border-border bg-card/50'>
			<div className='container-custom py-16'>
				<div className='grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4'>
					{/* Brand */}
					<div className='col-span-1'>
						<Link to='/' className='flex items-center gap-2 mb-4'>
							<div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary'>
								<BookOpen className='h-5 w-5 text-primary-foreground' />
							</div>
							<span className='text-lg font-bold'>
								Курсовой<span className='text-primary'>Маркет</span>
							</span>
						</Link>
						<p className='text-sm text-muted-foreground leading-relaxed max-w-[220px]'>
							Платформа для поиска исполнителей и заказа учебных работ по
							заданным условиям.
						</p>
						<div className='flex items-center gap-3 mt-6'>
							<a
								href='https://github.com'
								target='_blank'
								rel='noopener noreferrer'
								className='flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors'
							>
								<Github className='h-4 w-4' />
							</a>
							<a
								href='mailto:support@cursovaimarket.ru'
								className='flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors'
							>
								<Mail className='h-4 w-4' />
							</a>
						</div>
					</div>

					{/* Links */}
					{Object.values(footerLinks).map(section => (
						<div key={section.title}>
							<h3 className='text-sm font-semibold text-foreground mb-4'>
								{section.title}
							</h3>
							<ul className='space-y-3'>
								{section.links.map(link => (
									<li key={link.href}>
										<Link
											to={link.href}
											className='text-sm text-muted-foreground hover:text-foreground transition-colors'
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				<div className='mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4'>
					<p className='text-xs text-muted-foreground'>
						© {new Date().getFullYear()} КурсовойМаркет. Все права защищены.
					</p>
					<p className='text-xs text-muted-foreground'>
						Сделано с ❤️ для студентов
					</p>
				</div>
			</div>
		</footer>
	)
}
