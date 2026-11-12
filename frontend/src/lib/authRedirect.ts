/** Only allow local paths; never protocol-relative or backslash-normalized URLs. */
export function safeAuthRedirect(value?: string): string {
	if (
		!value ||
		value.length > 2048 ||
		!/^\/(?!\/)/.test(value) ||
		/[\\\s%]/.test(value.split(/[?#]/)[0]) ||
		Array.from(value).some(
			(char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
		)
	)
		return '/'
	return value
}
