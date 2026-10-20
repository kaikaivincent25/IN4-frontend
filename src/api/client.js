

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ===== CONFIG =====

// Change this to your backend URL
// In dev: http://192.168.0.105:8000 (your machine's IP)
// In prod: https://api.in4.app
const API_BASE_URL = 'http://10.3.1.31:8000';
//const API_BASE_URL = 'http://10.0.2.2:8000'   //Android studio emulator 

const TIMEOUT = 10000; // 10 second timeout for requests

export const resolveMediaUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Token storage keys (constants prevent typos)
const TOKEN_KEYS = {
  ACCESS: 'in4_access_token',
  REFRESH: 'in4_refresh_token',
};

// ===== AXIOS INSTANCE =====

/**
 * Create axios instance with base config
 * This is the "base" client before interceptors
 */
const client = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===== REQUEST INTERCEPTOR =====

/**
 * Before sending ANY request:
 * 1. Retrieve access token from secure storage
 * 2. Add it to Authorization header
 * 3. Let request proceed
 * 
 * Why interceptor?
 * - Don't manually add token to every API call
 * - Centralized place to add headers
 * - Can add other headers here (version, device ID, etc.)
 */
client.interceptors.request.use(
  async (config) => {
    try {
      // Get token from secure storage
      const token = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
      
      if (token) {
        // Add to Authorization header
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to retrieve token from SecureStore', error);
      // Don't crash if token retrieval fails, just continue
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== RESPONSE INTERCEPTOR =====

/**
 * When response comes back from server:
 * 1. If 401 (token expired), refresh token
 * 2. If refresh successful, retry original request
 * 3. If refresh fails, clear tokens (force re-login)
 * 4. Return error or successful response
 * 
 * Why this matters?
 * - User experience: no logout when token expires
 * - Security: access token is short-lived (1 hour)
 * - Seamless: refresh happens in background
 */
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token
        const refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.REFRESH);
        
        if (!refreshToken) {
          // No refresh token = must re-login
          await clearAuthTokens();
          return Promise.reject(error);
        }
        
        // Call refresh endpoint
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/token/refresh/`,
          { refresh: refreshToken }
        );
        
        const { access } = response.data;
        
        // Store new access token
        await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, access);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return client(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and reject
        await clearAuthTokens();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// ===== TOKEN MANAGEMENT =====

/**
 * Store both access and refresh tokens securely
 * 
 * Security:
 * - Uses SecureStore (encrypted on device)
 * - Not localStorage (which is insecure)
 * - Async (doesn't block UI)
 */
export const storeAuthTokens = async (accessToken, refreshToken) => {
  try {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, accessToken),
      SecureStore.setItemAsync(TOKEN_KEYS.REFRESH, refreshToken),
    ]);
  } catch (error) {
    console.error('Failed to store tokens', error);
    throw error;
  }
};

/**
 * Retrieve access token (used by other parts of app)
 */
export const getAccessToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
  } catch (error) {
    console.error('Failed to retrieve access token', error);
    return null;
  }
};

/**
 * Clear both tokens from secure storage
 * Called on logout or token refresh failure
 */
export const clearAuthTokens = async () => {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS),
      SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH),
    ]);
  } catch (error) {
    console.error('Failed to clear tokens', error);
  }
};

// ===== API METHODS =====

/**
 * All API calls go through these functions
 * Provides type-safe interface to backend
 * Single source of truth for API endpoints
 */

export const authAPI = {
  /**
   * Register new user
   * @param {string} email
   * @param {string} password
   * @param {string} passwordConfirm
   * @param {string} firstName
   * @param {string} lastName
   * @returns {Promise}
   */
  register: async (email, password, passwordConfirm, firstName, lastName) => {
    const response = await client.post('/auth/register/', {
      email,
      password,
      password_confirm: passwordConfirm,
      first_name: firstName,
      last_name: lastName,
    });
    return response.data;
  },

  /**
   * Login with email/password
   * @param {string} email
   * @param {string} password
   * @returns {Promise}
   */
  login: async (email, password) => {
    const response = await client.post('/auth/login/', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Get current user's profile
   * Requires valid access token
   */
  getProfile: async () => {
    const response = await client.get('/auth/profile/');
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (firstName, lastName) => {
    const response = await client.put('/auth/profile/', {
      first_name: firstName,
      last_name: lastName,
    });
    return response.data;
  },

  uploadProfileImage: async (image) => {
    const form = new FormData();
    form.append('file', { uri: image.uri, name: image.name, type: image.mimeType || 'image/jpeg' });
    const response = await client.post('/media/profile-image/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data;
  },

  removeProfileImage: async () => {
    const response = await client.delete('/media/profile-image/');
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (oldPassword, newPassword, newPasswordConfirm) => {
    const response = await client.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    });
    return response.data;
  },

  /**
   * Logout (clear local tokens)
   * Backend doesn't require logout call in JWT auth
   */
  logout: async () => {
    await clearAuthTokens();
  },
};

export const expertAPI = {
  /**
   * List all verified experts
   */
  listExperts: async (profession = null, search = null) => {
    const params = {};
    if (profession) params.profession = profession;
    if (search) params.search = search;
    
    const response = await client.get('/experts/', { params });
    return response.data;
  },

  /**
   * Get expert profile by slug
   */
  getExpertProfile: async (slug) => {
    const response = await client.get(`/experts/${slug}/`);
    return response.data;
  },

  /**
   * Apply to become an expert
   */
  applyAsExpert: async (profession, licenseNumber, licenseIssuer, bio, expertiseAreas, organization, location, languages, consultationMethods) => {
    const response = await client.post('/experts/apply/', {
      profession,
      license_number: licenseNumber,
      license_issuer: licenseIssuer,
      bio,
      expertise_areas: expertiseAreas,
      organization,
      location,
      languages,
      consultation_methods: consultationMethods,
    });
    return response.data;
  },

  /**
   * Get authenticated expert's profile
   */
  getMyProfile: async () => {
    const response = await client.get('/experts/me/');
    return response.data;
  },

  /**
   * Update expert profile
   */
  updateMyProfile: async (profile) => {
    const response = await client.put('/experts/me/', {
      bio: profile.bio,
      expertise_areas: profile.expertise_areas,
      organization: profile.organization,
      location: profile.location,
      languages: profile.languages,
      consultation_methods: profile.consultation_methods,
    });
    return response.data;
  },

  uploadVerificationDocument: async (expertId, document) => {
    const form = new FormData();
    form.append('file', { uri: document.uri, name: document.name, type: document.mimeType || 'application/pdf' });
    const response = await client.post(`/experts/${expertId}/documents/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data;
  },

  vouchForExpert: async (expertId, relationshipType, note = '') => {
    const response = await client.post(`/experts/${expertId}/vouches/`, {
      relationship_type: relationshipType,
      note,
    });
    return response.data;
  },
};



export const articleAPI = {
  uploadImage: async (image) => {
    const form = new FormData();
    form.append('file', { uri: image.uri, name: image.name, type: image.mimeType || 'image/jpeg' });
    const response = await client.post('/media/article-image/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data;
  },
  /**
   * List published articles
   */
  listArticles: async (category = null, search = null, orderBy = '-published_at', page = 1, profession = null) => {
    const params = { order_by: orderBy, page };
    if (category) params.category = category;
    if (search) params.search = search;
    if (profession) params.profession = profession;
    
    const response = await client.get('/articles/', { params });
    return response.data;
  },


  /**
   * Get article by slug
   */
  getArticle: async (slug) => {
    const response = await client.get(`/articles/${slug}/`);
    return response.data;
  },

  /**
   * Create new article draft
   */
  createDraft: async (title, summary, body, categoryId, featuredImage = null) => {
    const response = await client.post('/articles/drafts/', {
      title,
      summary,
      body,
      category_id: categoryId,
      // include both keys for compatibility with different backend serializers
      category: categoryId,
      featured_image: featuredImage,
    });
    return response.data;
  },

  /**
   * Auto-save or update existing draft
   */
  autoSaveDraft: async (draftId, title, summary, body, categoryId, featuredImage = null) => {
    if (draftId) {
      const response = await client.post(`/articles/drafts/${draftId}/save/`, {
        title,
        summary,
        body,
        // send both keys to be safe: some serializers expect 'category', others 'category_id'
        category: categoryId,
        category_id: categoryId,
        featured_image: featuredImage,
      });
      return response.data;
    }

    return await articleAPI.createDraft(
      title,
      summary,
      body,
      categoryId,
      featuredImage
    );
  },

  /**
   * Publish draft article
   */
  publishDraft: async (draftId) => {
    const response = await client.post(`/articles/drafts/${draftId}/publish/`);
    return response.data;
  },

  /**
   * Get my draft articles
   */
  getMyDrafts: async () => {
    const response = await client.get('/articles/me/drafts/');
    return response.data;
  },

  /** List editor drafts (ArticleDraft records) for the signed-in expert. */
  listDrafts: async (page = 1) => {
    const response = await client.get('/articles/drafts/', { params: { page } });
    return response.data;
  },

  getDraft: async (draftId) => {
    const response = await client.get(`/articles/drafts/${draftId}/`);
    return response.data;
  },

  deleteDraft: async (draftId) => {
    const response = await client.delete(`/articles/drafts/${draftId}/`);
    return response.data;
  },

  createEditDraft: async (articleId) => {
    const response = await client.post(`/articles/${articleId}/edit-draft/`);
    return response.data.draft;
  },

  submitRevision: async (draftId, payload) => {
    const response = await client.post(`/articles/drafts/${draftId}/submit-revision/`, {
      title: payload.title,
      summary: payload.summary,
      body: payload.body,
      category_id: payload.categoryId,
      featured_image: payload.featuredImage,
      change_note: payload.changeNote,
    });
    return response.data;
  },

  getMyRevisions: async (page = 1) => {
    const response = await client.get('/articles/me/revisions/', { params: { page } });
    return response.data;
  },

  getReviewQueue: async (page = 1) => {
    const response = await client.get('/articles/revisions/review-queue/', { params: { page } });
    return response.data;
  },

  reviewRevision: async (revisionId, status, reviewerNote = '') => {
    const response = await client.patch(`/articles/revisions/${revisionId}/review/`, {
      status,
      reviewer_note: reviewerNote || null,
    });
    return response.data;
  },

  /**
   * Delete draft article
   */
  deleteArticle: async (articleId) => {
    const response = await client.delete(`/articles/${articleId}/`);
    return response.data;
  },
};

export const categoryAPI = {
  /**
   * List all categories
   */
  listCategories: async () => {
    const response = await client.get('/categories/');
    // Backend may return paginated results ({ results: [...] })
    // Normalize to always return an array of categories
    return response.data.results || response.data;
  },

  /**
   * Get category by slug
   */
  getCategory: async (slug) => {
    const response = await client.get(`/categories/${slug}/`);
    return response.data;
  },
};

export const engagementAPI = {
  /**
   * Save article to reading list
   */
  saveArticle: async (articleId) => {
    const response = await client.post('/engagements/saved/save/', {
      article_id: articleId,
    });
    return response.data;
  },

  /**
   * Remove article from reading list
   */
  unsaveArticle: async (articleId) => {
    const response = await client.post('/engagements/saved/unsave/', {
      article_id: articleId,
    });
    return response.data;
  },

  /**
   * Get reading list
   */
  getSavedArticles: async (page = 1) => {
    const response = await client.get('/engagements/saved/', { params: { page } });
    return response.data;
  },

  /**
   * Get count of saved articles
   */
  getSavedCount: async () => {
    const response = await client.get('/engagements/saved/count/');
    return response.data;
  },

  /**
   * Check if specific article is saved
   */
  isArticleSaved: async (articleId) => {
    const response = await client.get('/engagements/saved/check/', {
      params: { article_id: articleId },
    });
    return response.data;
  },

  /**
   * Record that user has read an article
   */
  recordRead: async (articleId) => {
    const response = await client.post('/engagements/history/record/', {
      article_id: articleId,
    });
    return response.data;
  },

  /**
   * Get reading history
   */
  getReadHistory: async (page = 1) => {
    const response = await client.get('/engagements/history/', { params: { page } });
    return response.data;
  },
};

export const communityAPI = {
  listExpertComments: async (slug, page = 1) => {
    const response = await client.get(`/community/experts/${slug}/comments/`, { params: { page } });
    return response.data;
  },
  getExpertCommentEligibility: async (slug) => {
    const response = await client.get(`/community/experts/${slug}/comments/eligibility/`);
    return response.data;
  },
  addExpertComment: async (slug, content) => {
    const response = await client.post(`/community/experts/${slug}/comments/`, { content });
    return response.data;
  },
  deleteExpertComment: async (commentId) => {
    const response = await client.delete(`/community/expert-comments/${commentId}/`);
    return response.data;
  },
  listComments: async (articleId, page = 1) => {
    const response = await client.get(`/community/articles/${articleId}/comments/`, { params: { page } });
    return response.data;
  },
  addComment: async (articleId, content) => {
    const response = await client.post(`/community/articles/${articleId}/comments/`, { content });
    return response.data;
  },
  deleteComment: async (commentId) => {
    const response = await client.delete(`/community/comments/${commentId}/`);
    return response.data;
  },
  startConversation: async (articleId) => {
    const response = await client.post('/community/conversations/', { article_id: articleId });
    return response.data;
  },
  listConversations: async () => {
    const response = await client.get('/community/conversations/');
    return response.data;
  },
  getMessages: async (conversationId) => {
    const response = await client.get(`/community/conversations/${conversationId}/messages/`);
    return response.data;
  },
  sendMessage: async (conversationId, content) => {
    const response = await client.post(`/community/conversations/${conversationId}/messages/`, { content });
    return response.data;
  },
};

export default client;
