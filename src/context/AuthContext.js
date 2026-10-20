/**
 * AuthContext - Global authentication state
 * 
 * Purpose:
 * - Store user data globally (avoid prop drilling)
 * - Track authentication status
 * - Provide login/logout functions to all screens
 * - Auto-restore session on app launch
 * 
 * Architecture:
 * - Context + useReducer for state management
 * - Mimics Redux but simpler (no Redux boilerplate)
 * - Actions: LOGIN, LOGOUT, RESTORE_TOKEN, etc.
 */

import React, { useReducer, useCallback, useEffect } from 'react';
import { authAPI, storeAuthTokens, clearAuthTokens, getAccessToken } from '../api/client';

// Create context (empty initially, populated by provider)
export const AuthContext = React.createContext();

// ===== INITIAL STATE =====

/**
 * Initial auth state
 * 
 * isLoading: true during token restoration
 * isSignout: true if user explicitly logged out
 * user: current user data, null if logged out
 * userToken: access token, null if logged out
 */
const initialState = {
  isLoading: true,
  isSignout: false,
  user: null,
  userToken: null,
};

// ===== REDUCER =====

/**
 * Reducer function for auth state
 * Handles all auth-related state changes
 */
const authReducer = (state, action) => {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      // App launched, check if user already logged in
      return {
        ...state,
        userToken: action.payload.token,
        user: action.payload.user,
        isLoading: false,
      };

    case 'SIGN_IN':
      // User logged in
      return {
        ...state,
        isSignout: false,
        user: action.payload.user,
        userToken: action.payload.token,
      };

    case 'SIGN_OUT':
      // User logged out
      return {
        ...state,
        isSignout: true,
        user: null,
        userToken: null,
      };

    case 'UPDATE_USER':
      // User data updated
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    default:
      return state;
  }
};

// ===== PROVIDER COMPONENT =====

/**
 * AuthProvider - Wraps app, provides auth context to all children
 * 
 * Usage:
 * <AuthProvider>
 *   <RootNavigator />
 * </AuthProvider>
 */
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * On app launch: restore token from SecureStore
   * This is called once, when app first loads
   * 
   * Flow:
   * 1. App launches
   * 2. AuthProvider mounts
   * 3. useEffect runs
   * 4. Fetch token from SecureStore
   * 5. If token exists, dispatch RESTORE_TOKEN
   * 6. Navigation sees token, shows home screen instead of login
   */
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Get token from secure storage
        const token = await getAccessToken();

        if (token) {
          // User was logged in, restore session
          try {
            // Fetch user profile to verify token is still valid
            const response = await authAPI.getProfile();
            dispatch({
              type: 'RESTORE_TOKEN',
              payload: {
                token,
                user: response.user,
              },
            });
          } catch (error) {
            // Token invalid, clear and start fresh
            await clearAuthTokens();
            dispatch({
              type: 'RESTORE_TOKEN',
              payload: { token: null, user: null },
            });
          }
        } else {
          // No token, user not logged in
          dispatch({
            type: 'RESTORE_TOKEN',
            payload: { token: null, user: null },
          });
        }
      } catch (error) {
        console.error('Failed to restore token', error);
        dispatch({
          type: 'RESTORE_TOKEN',
          payload: { token: null, user: null },
        });
      }
    };

    bootstrapAsync();
  }, []);

  /**
   * Login handler
   * Called from LoginScreen
   */
  const authContext = {
    login: useCallback(async (email, password) => {
      try {
        // Call backend login API
        const response = await authAPI.login(email, password);
        const { tokens, user } = response;

        // Store tokens securely
        await storeAuthTokens(tokens.access, tokens.refresh);

        // Update global state
        dispatch({
          type: 'SIGN_IN',
          payload: {
            token: tokens.access,
            user,
          },
        });

        return { success: true };
      } catch (error) {
        // Handle login error
        const message = error.response?.data?.errors?.non_field_errors?.[0]
          || error.response?.data?.message
          || 'Login failed';

        return {
          success: false,
          error: message,
        };
      }
    }, []),

    /**
     * Register handler
     * Called from RegisterScreen
     */
    register: useCallback(async (email, password, passwordConfirm, firstName, lastName) => {
      try {
        const response = await authAPI.register(
          email,
          password,
          passwordConfirm,
          firstName,
          lastName
        );
        const { tokens, user } = response;

        await storeAuthTokens(tokens.access, tokens.refresh);

        dispatch({
          type: 'SIGN_IN',
          payload: {
            token: tokens.access,
            user,
          },
        });

        return { success: true };
      } catch (error) {
        const responseData = error.response?.data;
        const errorData = responseData?.errors;
        const firstErrorKey = errorData && typeof errorData === 'object'
          ? Object.keys(errorData)[0]
          : null;

        if (firstErrorKey) {
          const firstError = errorData[firstErrorKey];
          const message = Array.isArray(firstError) ? firstError[0] : firstError;
          if (typeof message === 'string' && message.length > 0) {
            return { success: false, error: message };
          }
        }

        return {
          success: false,
          error: responseData?.message
            || responseData?.detail
            || error.message
            || 'Registration failed',
        };
      }
    }, []),

    /**
     * Logout handler
     * Called from settings or auth error
     */
    logout: useCallback(async () => {
      try {
        await authAPI.logout();
        dispatch({ type: 'SIGN_OUT' });
        return { success: true };
      } catch (error) {
        console.error('Logout error', error);
        // Still clear local state even if logout call fails
        dispatch({ type: 'SIGN_OUT' });
        return { success: false };
      }
    }, []),

    /**
     * Update user data after profile changes
     */
    updateUser: useCallback((userData) => {
      dispatch({
        type: 'UPDATE_USER',
        payload: userData,
      });
    }, []),
  };

  return (
    <AuthContext.Provider value={{ ...state, ...authContext }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 * Usage: const { user, userToken, login, logout } = useAuth();
 */
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
