import apiClient from './client'

export type OAuthProvider = 'google' | 'yandex'

export async function getOAuthProviders() {
	const { data } = await apiClient.get<Record<OAuthProvider, boolean>>(
		'/v1/auth/oauth/providers',
	)
	return data
}

export async function getOAuthAccounts() {
	const { data } = await apiClient.get<{ provider: OAuthProvider }[]>(
		'/v1/auth/oauth/accounts',
	)
	return data
}

export async function startOAuth(
	provider: OAuthProvider,
	options: {
		role?: 'STUDENT' | 'FREELANCER'
		redirect?: string
		link?: boolean
	},
) {
	const { data } = await apiClient.post<{ url: string }>(
		`/v1/auth/oauth/${provider}/${options.link ? 'link' : 'start'}`,
		{
			role: options.role ?? 'STUDENT',
			redirect: options.redirect,
		},
	)
	window.location.assign(data.url)
}
