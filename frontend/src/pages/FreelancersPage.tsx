import { getFreelancers } from '@/api/services'
import FreelancerCard from '@/features/freelancers/FreelancerCard'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { useState } from 'react'

const LIMIT = 12

export default function FreelancersPage() {
	const [page, setPage] = useState(1)

	const { data, isLoading } = useQuery({
		queryKey: ['freelancers', page],
		queryFn: () => getFreelancers(page, LIMIT),
	})

	const freelancers = data?.data ?? []
	const total = data?.total ?? 0
	const totalPages = Math.ceil(total / LIMIT)

	return (
		<div className='min-h-screen bg-background'>
			<div className='container-custom py-10'>
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					className='mb-8'
				>
					<h1 className='text-3xl font-bold text-foreground mb-2'>
						Исполнители
					</h1>
					<p className='text-muted-foreground'>
						Проверенные авторы для курсовых, дипломных и рефератов
					</p>
				</motion.div>

				{/* Loading */}
				{isLoading && (
					<div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-4'>
						{Array.from({ length: 6 }).map((_, i) => (
							<div
								key={i}
								className='h-64 bg-muted/50 rounded-2xl animate-pulse'
							/>
						))}
					</div>
				)}

				{/* Empty */}
				{!isLoading && freelancers.length === 0 && (
					<div className='flex flex-col items-center justify-center py-32 text-center'>
						<Users className='w-12 h-12 text-muted-foreground/30 mb-4' />
						<p className='text-muted-foreground'>Исполнители не найдены</p>
					</div>
				)}

				{/* Grid */}
				{!isLoading && freelancers.length > 0 && (
					<div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-4'>
						{freelancers.map((fl, i) => (
							<FreelancerCard key={fl.id} freelancer={fl} index={i} />
						))}
					</div>
				)}

				{/* Pagination */}
				{totalPages > 1 && (
					<div className='flex justify-center items-center gap-2 mt-10'>
						<button
							onClick={() => setPage(p => Math.max(1, p - 1))}
							disabled={page === 1}
							className='w-9 h-9 rounded-xl text-sm font-medium bg-muted text-foreground hover:bg-muted/70 disabled:opacity-40 transition-colors'
						>
							←
						</button>

						{(() => {
							const delta = 2
							const range: (number | '...')[] = []
							let prev = 0
							for (let p = 1; p <= totalPages; p++) {
								if (
									p === 1 ||
									p === totalPages ||
									(p >= page - delta && p <= page + delta)
								) {
									if (prev && p - prev > 1) range.push('...')
									range.push(p)
									prev = p
								}
							}
							return range.map((p, i) =>
								p === '...' ? (
									<span
										key={`ellipsis-${i}`}
										className='w-9 h-9 flex items-center justify-center text-muted-foreground text-sm'
									>
										···
									</span>
								) : (
									<button
										key={p}
										onClick={() => setPage(p as number)}
										className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
											p === page
												? 'bg-primary text-primary-foreground'
												: 'bg-muted text-foreground hover:bg-muted/70'
										}`}
									>
										{p}
									</button>
								),
							)
						})()}

						<button
							onClick={() => setPage(p => Math.min(totalPages, p + 1))}
							disabled={page >= totalPages}
							className='w-9 h-9 rounded-xl text-sm font-medium bg-muted text-foreground hover:bg-muted/70 disabled:opacity-40 transition-colors'
						>
							→
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
