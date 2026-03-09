import axios from 'axios';

const API_KEY = 'aa7e8e458d612c6d7756903cdd7bd805';
const BASE_URL = 'https://api.themoviedb.org/3';

// 1. Create a configured instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
  },
});

// 2. A helper function to handle all requests
const fetchData = async (endpoint, options = {}) => {
  try {
    const response = await apiClient.get(endpoint, { params: options });
    return response.data.results;
  } catch (error) {
    console.error(`API Error at ${endpoint}:`, error);
    return [];
  }
};

// 3. Clean, exported functions
export const getPopularMovies = () => fetchData('/movie/popular');

export const getPopularTV = () => fetchData('/tv/popular');

export const searchMovies = (query) => 
  fetchData('/search/movie', { query: encodeURIComponent(query) });

export const searchTV = (query) => 
  fetchData('/search/tv', { query: encodeURIComponent(query) });

// Bonus: Multi-search (Movies & TV at once)
export const searchMulti = (query) => 
  fetchData('/search/multi', { query: encodeURIComponent(query) });