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
					<div className='flex justify-center gap-2 mt-10'>
						{Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
							<button
								key={p}
								onClick={() => setPage(p)}
								className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
									p === page
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-foreground hover:bg-muted/70'
								}`}
							>
								{p}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
