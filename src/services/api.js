import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

const apiClient = axios.create({
  baseURL: BASE_URL,
  params: { api_key: API_KEY },
});

// Returns raw response.data (callers extract what they need)
const fetchData = async (endpoint, options = {}) => {
  try {
    const response = await apiClient.get(endpoint, { params: options });
    return response.data;
  } catch (error) {
    console.error(`API Error at ${endpoint}:`, error.response?.data?.status_message || error.message);
    return null;
  }
};

// List endpoints: extract .results array
const fetchList = async (endpoint, options = {}) => {
  const data = await fetchData(endpoint, options);
  return data?.results ?? [];
};

export const getPopularMovies  = () => fetchList('/movie/popular');
export const getPopularTV      = () => fetchList('/tv/popular');
export const searchMovies      = (query) => fetchList('/search/movie', { query });
export const searchTV          = (query) => fetchList('/search/tv',    { query });

export const getMovieGenres    = () => fetchData('/genre/movie/list').then(d => d?.genres ?? []);
export const getTVGenres       = () => fetchData('/genre/tv/list').then(d => d?.genres ?? []);

export const discoverMovies    = (genreId) => fetchList('/discover/movie', { with_genres: genreId, sort_by: 'popularity.desc' });
export const discoverTV        = (genreId) => fetchList('/discover/tv',    { with_genres: genreId, sort_by: 'popularity.desc' });

export const getTVDetails      = (id) => fetchData(`/tv/${id}`);