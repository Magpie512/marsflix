import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

const apiClient = axios.create({
  baseURL: BASE_URL,
  params: { api_key: API_KEY },
});

const fetchData = async (endpoint, options = {}) => {
  try {
    const response = await apiClient.get(endpoint, { params: options });
    console.log(`Data from ${endpoint}:`, response.data); 
    return response.data; 
  } catch (error) {
    console.error(`API Error at ${endpoint}:`, error.response?.data?.status_message || error.message);
    return null;
  }
};

export const getPopularMovies  = () => fetchData('/movie/popular');
export const getPopularTV      = () => fetchData('/tv/popular');
export const searchMovies      = (query) => fetchData('/search/movie', { query });
export const searchTV          = (query) => fetchData('/search/tv',    { query });

export const getMovieGenres    = () => fetchData('/genre/movie/list').then(d => d.genres ?? []);
export const getTVGenres       = () => fetchData('/genre/tv/list').then(d => d.genres ?? []);

export const discoverMovies    = (genreId) => fetchData('/discover/movie', { with_genres: genreId, sort_by: 'popularity.desc' });
export const discoverTV        = (genreId) => fetchData('/discover/tv',    { with_genres: genreId, sort_by: 'popularity.desc' });

export const getTVDetails      = (id) => fetchData(`/tv/${id}`);