import { getPaymentsConfig } from '@/api/orders'
import { useQuery } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'

/**
 * Честная плашка вместо фейковой формы карты: пока подключён
 * провайдер-заглушка, настоящие деньги не двигаются, и пользователь должен
 * об этом знать. Когда появится реальный провайдер, isLive станет true
 * и плашка исчезнет сама — трогать код не придётся.
 */
export function PaymentModeBanner() {
	const { data: config } = useQuery({
		queryKey: ['payments-config'],
		queryFn: getPaymentsConfig,
		staleTime: 1000 * 60 * 60, // режим оплаты не меняется на ходу
	})

	if (!config || config.isLive) return null

	return (
		<div className='flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3'>
			<FlaskConical className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
			<div className='text-xs text-amber-900 dark:text-amber-200'>
				<p className='font-medium'>Тестовый режим — оплата не проводится</p>
				<p className='mt-0.5 opacity-80'>
					Заказы подтверждаются и закрываются как обычно, но деньги не
					списываются и не выплачиваются. Комиссия платформы: {config.feePercent}
					%.
				</p>
			</div>
		</div>
	)
}
