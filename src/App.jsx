import { useState, useEffect } from 'react'
import './App.css'
import { getPopularMovies, searchMovies } from './services/api'

function App() {
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);

  // Load popular movies by default
  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    const results = searchQuery.trim()
      ? await searchMovies(searchQuery)
      : await getPopularMovies();

    setMovies(results);
    setLoading(false);
  };

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie);
  };

  const closeModal = () => {
    setSelectedMovie(null);
  };

  // Generate VidKing player URL
  const getPlayerUrl = (tmdbId) => {
    return `https://www.vidking.net/embed/movie/${tmdbId}?color=e50914&autoPlay=true`;
  };

  const heroMovie = movies.length > 0 ? movies[0] : null;

  return (
    <div className="app-container">
      <header>
        <h1>Marsflix</h1>

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

      {loading ? (
        <h2 style={{ padding: "40px" }}>Loading...</h2>
      ) : (
        <>
          {/* --- HERO SHOWCASE --- */}
          {heroMovie && (
            <div
              className="hero-card"
              style={{
                backgroundImage: `url(https://image.tmdb.org/t/p/original${heroMovie.backdrop_path})`
              }}
              onClick={() => handleMovieClick(heroMovie)}
            >
              <div className="hero-overlay">
                <h2>{heroMovie.title}</h2>
                <p>{heroMovie.overview}</p>
                <button className="watch-now-btn">▶ Watch Now</button>
              </div>
            </div>
          )}

          {/* --- MOVIE GRID --- */}
          <div className="movie-grid">
            {movies.map((movie) => (
              <div 
                key={movie.id} 
                className="movie-card"
                onClick={() => handleMovieClick(movie)}
              >
                <img
                  src={
                    movie.poster_path
                      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                      : "https://via.placeholder.com/500x750?text=No+Image"
                  }
                  alt={movie.title}
                />
                <h3>{movie.title}</h3>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- MOVIE PLAYER MODAL --- */}
      {selectedMovie && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>×</button>
            
            <div className="modal-header">
              <h2>{selectedMovie.title}</h2>
              <div className="movie-meta">
                <span className="release-date">
                  {selectedMovie.release_date ? new Date(selectedMovie.release_date).getFullYear() : 'N/A'}
                </span>
                <span className="rating">⭐ {selectedMovie.vote_average?.toFixed(1)}/10</span>
              </div>
            </div>

            {/* VidKing Player */}
            <div className="player-container">
              <iframe 
                src={getPlayerUrl(selectedMovie.id)}
                width="100%" 
                height="500" 
                frameBorder="0" 
                allowFullScreen
                allow="autoplay; encrypted-media"
                title={selectedMovie.title}
              />
            </div>

            <div className="movie-details">
              <p className="overview">{selectedMovie.overview}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;