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
    return response.data;
  } catch (error) {
    console.error(`API Error at ${endpoint}:`, error.response?.data?.status_message || error.message);
    return null;
  }
};

// Returns { results, totalPages }
const fetchListPaged = async (endpoint, options = {}) => {
  const data = await fetchData(endpoint, options);
  return {
    results: data?.results ?? [],
    totalPages: data?.total_pages ?? 1,
  };
};

const fetchList = async (endpoint, options = {}) => {
  const { results } = await fetchListPaged(endpoint, options);
  return results;
};

export const getPopularMovies  = (page = 1) => fetchListPaged('/movie/popular', { page });
export const getPopularTV      = (page = 1) => fetchListPaged('/tv/popular', { page });
export const searchMovies      = (query, page = 1) => fetchListPaged('/search/movie', { query, page });
export const searchTV          = (query, page = 1) => fetchListPaged('/search/tv', { query, page });

// Combined search: fetches both movies and TV, merges and sorts by popularity
export const searchAll = async (query, page = 1) => {
  const [movies, tv] = await Promise.all([
    fetchListPaged('/search/movie', { query, page }),
    fetchListPaged('/search/tv', { query, page }),
  ]);
  const taggedMovies = movies.results.map(m => ({ ...m, _mediaType: 'movie' }));
  const taggedTV = tv.results.map(t => ({ ...t, _mediaType: 'tv' }));
  const merged = [...taggedMovies, ...taggedTV].sort(
    (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
  );
  return {
    results: merged,
    totalPages: Math.max(movies.totalPages, tv.totalPages),
  };
};

export const getMovieGenres    = () => fetchData('/genre/movie/list').then(d => d?.genres ?? []);
export const getTVGenres       = () => fetchData('/genre/tv/list').then(d => d?.genres ?? []);

export const discoverMovies    = (genreId, page = 1) => fetchListPaged('/discover/movie', { with_genres: genreId, sort_by: 'popularity.desc', page });
export const discoverTV        = (genreId, page = 1) => fetchListPaged('/discover/tv', { with_genres: genreId, sort_by: 'popularity.desc', page });

export const getTVDetails      = (id) => fetchData(`/tv/${id}`);