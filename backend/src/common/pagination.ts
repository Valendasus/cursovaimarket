/**
 * Приводит page/limit к безопасным границам.
 *
 * Без верхнего предела запрос `?limit=99999999` уходит прямо в Prisma `take`
 * и заставляет сервер тянуть в память всю таблицу — простейший DoS.
 * Нижние границы отсекают page=0 / отрицательные значения, дающие
 * отрицательный skip и падение запроса.
 */
export function clampPagination(
	page: unknown,
	limit: unknown,
	{ defaultLimit, maxLimit }: { defaultLimit: number; maxLimit: number },
): { page: number; limit: number; skip: number } {
	const rawPage = Number(page)
	const rawLimit = Number(limit)

	const safePage =
		Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1
	const safeLimit =
		Number.isFinite(rawLimit) && rawLimit >= 1
			? Math.min(Math.floor(rawLimit), maxLimit)
			: defaultLimit

	return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit }
}
