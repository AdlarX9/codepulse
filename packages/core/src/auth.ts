/**
 * Authentication utilities for CodePulse
 */

import type { User, AuthSession, LoginCredentials, RegisterData, AuthResponse } from './types'

/**
 * Authentication service interface
 */
export interface AuthService {
	login(credentials: LoginCredentials): Promise<AuthResponse>
	register(data: RegisterData): Promise<AuthResponse>
	logout(): Promise<void>
	getCurrentUser(): Promise<User | null>
	isAuthenticated(): boolean
}

/**
 * Mock authentication service for development
 * In production, this would connect to your backend API
 */
export class MockAuthService implements AuthService {
	private currentUser: User | null = null

	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		// Simulate API call delay
		await new Promise(resolve => setTimeout(resolve, 1000))

		// Mock validation - in production this would call your API
		if (credentials.email === 'demo@codepulse.app' && credentials.password === 'demo') {
			this.currentUser = {
				id: '1',
				email: credentials.email,
				name: 'Demo User',
				isAdmin: credentials.email.includes('admin'),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			return {
				success: true,
				user: this.currentUser
			}
		}

		return {
			success: false,
			message: 'Invalid credentials'
		}
	}

	async register(data: RegisterData): Promise<AuthResponse> {
		// Simulate API call delay
		await new Promise(resolve => setTimeout(resolve, 1000))

		// Mock validation - in production this would call your API
		if (data.email && data.password.length >= 6) {
			this.currentUser = {
				id: Date.now().toString(),
				email: data.email,
				name: data.name,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			return {
				success: true,
				user: this.currentUser
			}
		}

		return {
			success: false,
			message: 'Invalid registration data'
		}
	}

	async logout(): Promise<void> {
		this.currentUser = null
	}

	async getCurrentUser(): Promise<User | null> {
		return this.currentUser
	}

	isAuthenticated(): boolean {
		return this.currentUser !== null
	}
}

/**
 * Create an authentication service instance
 */
export function createAuthService(): AuthService {
	// In production, you might want to use different implementations
	// based on environment or configuration
	return new MockAuthService()
}
