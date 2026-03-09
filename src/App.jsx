import { useState, useEffect } from 'react'
import './App.css'
import { getPopularMovies, searchMovies } from './services/api'

function App() {
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Load popular movies by default
  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault(); // Prevent page reload if called from a form
    setLoading(true);
    
    const results = searchQuery.trim() 
      ? await searchMovies(searchQuery) 
      : await getPopularMovies();
      
    setMovies(results);
    setLoading(false);
  };

  return (
    <div className="app-container">
      <header>
        <h1>Marsflix</h1>
        {/* Search Bar Form */}
        <form onSubmit={handleSearch} className="search-form">
          <input 
            type="text" 
            placeholder="Find a flick..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </header>

      {loading ? <h2>Loading...</h2> : (
        <div className="movie-grid">
          {movies.map((movie) => (
            <div key={movie.id} className="movie-card">
              <img 
                src={movie.poster_path 
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
                  : 'https://via.placeholder.com/500x750?text=No+Image'} 
                alt={movie.title} 
              />
              <h3>{movie.title}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App