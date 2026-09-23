import type { OrderStatus } from '@/types'
import apiClient from './client'

// ─── Backend types ────────────────────────────────────────────────────────────

export interface BackendOrder {
	id: string
	serviceId: string
	packageId: string
	studentId: string
	freelancerId: string
	status: string
	requirements?: string | null
	totalPrice: number // kopecks
	deadline?: string | null
	confirmDeadline?: string | null
	confirmedAt?: string | null
	createdAt: string
	updatedAt: string
	packageName: string
	packageDescription?: string | null
	packageDeliveryDays: number
	packageRevisions: number
	packageFeatures: string[]
	payment?: BackendPayment | null
	deadlineExtensions?: BackendDeadlineExtension[]
	refundRequests?: BackendRefundRequest[]
	service?: { id: string; title: string; images?: string[] }
	package?: {
		id: string
		name: string
		price: number
		deliveryDays: number
		revisions?: number
		features?: string[]
	}
	student?: { id: string; name: string; avatar?: string }
	freelancer?: { id: string; name: string; avatar?: string }
	review?: { id: string; rating: number; comment?: string } | null
}

export type DeadlineExtensionStatus = 'pending' | 'approved' | 'rejected'

export interface BackendDeadlineExtension {
	id: string
	additionalDays: number
	reason: string
	status: 'PENDING' | 'APPROVED' | 'REJECTED'
	createdAt: string
	resolvedAt?: string | null
}

export interface DeadlineExtension {
	id: string
	additionalDays: number
	reason: string
	status: DeadlineExtensionStatus
	createdAt: string
	resolvedAt?: string | null
}

export type RefundReason =
	| 'MISSED_DEADLINE'
	| 'WORK_NOT_DELIVERED'
	| 'QUALITY_ISSUE'
	| 'REQUIREMENTS_NOT_MET'
	| 'OTHER'

export type RefundRequestStatus = 'pending' | 'approved' | 'rejected'

export interface BackendRefundRequest {
	id: string
	reason: RefundReason
	message?: string
	status: 'PENDING' | 'APPROVED' | 'REJECTED'
	createdAt: string
}

export interface RefundRequest {
	id: string
	reason: RefundReason
	message?: string
	status: RefundRequestStatus
	createdAt: string
}

export interface BackendPayment {
	id: string
	amount: number // kopecks
	fee: number // kopecks
	status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'
	failureReason?: string | null
	paidAt?: string | null
}

// ─── Mapped type used in UI ───────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export interface Payment {
	id: string
	/** Сумма, списанная с заказчика, в рублях */
	amount: number
	/** Комиссия платформы, в рублях */
	fee: number
	status: PaymentStatus
	failureReason?: string | null
	paidAt?: string | null
}

export interface Order {
	id: string
	serviceId: string
	packageId: string
	studentId: string
	freelancerId: string
	status: OrderStatus
	requirements?: string | null
	/** Price in rubles (already converted from kopecks) */
	totalPrice: number
	deadline?: string | null
	/** Докуда исполнитель должен подтвердить заказ; null у заказов до появления оплаты */
	confirmDeadline?: string | null
	confirmedAt?: string | null
	createdAt: string
	updatedAt: string
	payment?: Payment | null
	latestDeadlineExtension?: DeadlineExtension
	latestRefundRequest?: RefundRequest
	service?: { id: string; title: string; thumbnail?: string }
	package?: {
		id: string
		name: string
		/** Price in rubles */
		price: number
		deliveryDays: number
		revisions?: number
		features?: string[]
	}
	student?: { id: string; name: string; avatar?: string }
	freelancer?: { id: string; name: string; avatar?: string }
	review?: { id: string; rating: number; comment?: string } | null
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapOrder(o: BackendOrder): Order {
	return {
		...o,
		status: o.status.toLowerCase() as OrderStatus,
		totalPrice: Math.round(o.totalPrice / 100),
		service: o.service
			? {
					id: o.service.id,
					title: o.service.title,
					thumbnail: o.service.images?.[0],
				}
			: undefined,
		package: o.package
			? {
					...o.package,
					price: Math.round(o.package.price / 100),
				}
			: undefined,
		payment: o.payment
			? {
					id: o.payment.id,
					amount: Math.round(o.payment.amount / 100),
					fee: Math.round(o.payment.fee / 100),
					status: o.payment.status.toLowerCase() as PaymentStatus,
					failureReason: o.payment.failureReason,
					paidAt: o.payment.paidAt,
				}
			: null,
		latestDeadlineExtension: o.deadlineExtensions?.[0]
			? {
					...o.deadlineExtensions[0],
					status:
						o.deadlineExtensions[0].status.toLowerCase() as DeadlineExtensionStatus,
				}
			: undefined,
		latestRefundRequest: o.refundRequests?.[0]
			? {
					...o.refundRequests[0],
					status:
						o.refundRequests[0].status.toLowerCase() as RefundRequestStatus,
				}
			: undefined,
	}
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function createOrder(
	packageId: string,
	requirements?: string,
): Promise<Order> {
	const { data } = await apiClient.post<BackendOrder>('/v1/orders', {
		packageId,
		...(requirements ? { requirements } : {}),
	})
	return mapOrder(data)
}

export async function getMyOrders(): Promise<Order[]> {
	const { data } = await apiClient.get<BackendOrder[]>('/v1/orders')
	return data.map(mapOrder)
}

export async function getOrderById(id: string): Promise<Order> {
	const { data } = await apiClient.get<BackendOrder>(`/v1/orders/${id}`)
	return mapOrder(data)
}

export async function updateOrderStatus(
	id: string,
	status: string,
): Promise<Order> {
	const { data } = await apiClient.patch<BackendOrder>(
		`/v1/orders/${id}/status`,
		{ status: status.toUpperCase() },
	)
	return mapOrder(data)
}

/** Исполнитель подтверждает заказ: PENDING → ожидает оплаты (без списания) */
export async function confirmOrder(id: string): Promise<Order> {
	const { data } = await apiClient.post<BackendOrder>(
		`/v1/orders/${id}/confirm`,
	)
	return mapOrder(data)
}

/** Заказчик оплачивает подтверждённый заказ: списание → заказ в работе */
export async function payOrder(id: string): Promise<Order> {
	const { data } = await apiClient.post<BackendOrder>(`/v1/orders/${id}/pay`)
	return mapOrder(data)
}

export async function requestDeadlineExtension(
	id: string,
	additionalDays: number,
	reason: string,
): Promise<DeadlineExtension> {
	const { data } = await apiClient.post<BackendDeadlineExtension>(
		`/v1/orders/${id}/deadline-extensions`,
		{ additionalDays, reason },
	)
	return {
		...data,
		status: data.status.toLowerCase() as DeadlineExtensionStatus,
	}
}

export async function resolveDeadlineExtension(
	orderId: string,
	requestId: string,
	approved: boolean,
): Promise<DeadlineExtension> {
	const { data } = await apiClient.patch<BackendDeadlineExtension>(
		`/v1/orders/${orderId}/deadline-extensions/${requestId}`,
		{ approved },
	)
	return {
		...data,
		status: data.status.toLowerCase() as DeadlineExtensionStatus,
	}
}

export async function createRefundRequest(
	orderId: string,
	reason: RefundReason,
	message: string,
): Promise<RefundRequest> {
	const { data } = await apiClient.post<BackendRefundRequest>(
		`/v1/orders/${orderId}/refund-requests`,
		{ reason, message },
	)
	return { ...data, status: data.status.toLowerCase() as RefundRequestStatus }
}

export interface PaymentsConfig {
	/** false — провайдер-заглушка, настоящие деньги не двигаются */
	isLive: boolean
	feePercent: number
}

export async function getPaymentsConfig(): Promise<PaymentsConfig> {
	const { data } = await apiClient.get<PaymentsConfig>('/v1/payments/config')
	return data
}
