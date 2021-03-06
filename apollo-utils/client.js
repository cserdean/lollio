import { ApolloClient, createNetworkInterface } from 'react-apollo'
import {
	SubscriptionClient,
	addGraphQLSubscriptions
} from 'subscriptions-transport-ws'
import fetch from 'isomorphic-fetch'
import Cookie from 'js-cookie'

let apolloClient = null

// Polyfill fetch() on the server (used by apollo-client)
if (!process.browser) {
	global.fetch = fetch
}

function create(initialState, { getToken }) {
	const networkInterface = createNetworkInterface({
		uri: 'https://api.lollio.tech/graphql'
	})

	networkInterface.use([
		{
			applyMiddleware(req, next) {
				if (!req.options.headers) {
					req.options.headers = {} // Create the header object if needed.
				}
				let token = getToken()
				if (!token) token = Cookie.get('session')
				req.options.headers.authorization = token
					? `Bearer ${token}`
					: undefined
				next()
			}
		}
	])

	return new ApolloClient({
		initialState,
		ssrMode: !process.browser, // Disables forceFetch on the server (so queries are only run once)
		networkInterface: process.browser
			? addGraphQLSubscriptions(
					networkInterface,
					new SubscriptionClient(
					'wss://api.lollio.tech/graphql'
						{
							reconnect: true
						}
					)
				)
			: networkInterface
	})
}

export default function initApollo(initialState, options) {
	// Make sure to create a new client for every server-side request so that data
	// isn't shared between connections (which would be bad)
	if (!process.browser) {
		return create(initialState, options)
	}

	// Reuse client on the client-side
	if (!apolloClient) {
		apolloClient = create(initialState, options)
	}

	return apolloClient
}
