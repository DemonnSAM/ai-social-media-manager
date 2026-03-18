import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const META_API_BASE = 'https://graph.facebook.com/v19.0';
const CLIENT_ID = process.env.META_APP_ID;
const CLIENT_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = process.env.META_REDIRECT_URI;

export const MetaService = {
  /**
   * Step 1: Exchange the short-lived OAuth code for a short-lived access token
   */
  async exchangeCodeForToken(code) {
    try {
      const response = await axios.get(`${META_API_BASE}/oauth/access_token`, {
        params: {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          code,
        },
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Meta: Error exchanging code for token', error.response?.data || error.message);
      throw new Error('Failed to exchange Meta OAuth code');
    }
  },

  /**
   * Step 2: Exchange the short-lived token for a long-lived one (60 days)
   */
  async getLongLivedToken(shortLivedToken) {
    try {
      const response = await axios.get(`${META_API_BASE}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          fb_exchange_token: shortLivedToken,
        },
      });
      return response.data; // { access_token, token_type, expires_in }
    } catch (error) {
      console.error('Meta: Error getting long lived token', error.response?.data || error.message);
      throw new Error('Failed to upgrade to long-lived Meta token');
    }
  },

  /**
   * Step 3: Fetch the user's Facebook Pages
   */
  async getFacebookPages(userAccessToken) {
    try {
      const response = await axios.get(`${META_API_BASE}/me/accounts`, {
        params: {
          access_token: userAccessToken,
          fields: 'id,name,access_token,picture{url},instagram_business_account',
        },
      });
      return response.data.data; // Array of pages
    } catch (error) {
      console.error('Meta: Error fetching FB pages', error.response?.data || error.message);
      throw new Error('Failed to fetch Facebook Pages');
    }
  },

  /**
   * Step 4: Fetch details for a specific Instagram Business Account
   */
  async getInstagramAccountInfo(igAccountId, pageAccessToken) {
    try {
      const response = await axios.get(`${META_API_BASE}/${igAccountId}`, {
        params: {
          access_token: pageAccessToken,
          fields: 'id,username,profile_picture_url,followers_count,media_count',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Meta: Error fetching IG account ${igAccountId}`, error.response?.data || error.message);
      return null;
    }
  }
};
