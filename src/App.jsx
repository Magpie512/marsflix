import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { getPopularMovies, getPopularTV, searchMovies, searchTV } from './services/api'

function App() {
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [mediaType, setMediaType] = useState("movie"); // "movie" | "tv"
  const [resultsLabel, setResultsLabel] = useState("");
  const [showAdblockBanner, setShowAdblockBanner] = useState(false);
  const debounceTimer = useRef(null);
  const searchInputRef = useRef(null);

  // Show adblock banner once per session if not dismissed
  useEffect(() => {
    const dismissed = sessionStorage.getItem("adblock-dismissed");
    if (!dismissed) setShowAdblockBanner(true);
  }, []);

  const dismissAdblockBanner = () => {
    sessionStorage.setItem("adblock-dismissed", "1");
    setShowAdblockBanner(false);
  };

  const fetchContent = useCallback(async (query, type) => {
    setLoading(true);
    let results;
    if (query.trim()) {
      results = type === "movie"
        ? await searchMovies(query)
        : await searchTV(query);
      setResultsLabel(`Results for "${query}"`);
    } else {
      results = type === "movie"
        ? await getPopularMovies()
        : await getPopularTV();
      setResultsLabel(type === "movie" ? "Popular Movies" : "Popular TV Shows");
    }
    setMovies(results);
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchContent("", mediaType);
  }, []);

  // Debounce search as user types
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchContent(searchQuery, mediaType);
    }, 400);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery, mediaType, fetchContent]);

  const handleMediaTypeSwitch = (type) => {
    setMediaType(type);
    // fetchContent will fire via useEffect
  };

  const handleClear = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && selectedMovie) {
        setSelectedMovie(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedMovie]);

  const handleMovieClick = (movie) => setSelectedMovie(movie);
  const closeModal = () => setSelectedMovie(null);

  const getPlayerUrl = (id, type) =>
    `https://www.vidking.net/embed/${type}/${id}?color=e50914&autoPlay=true`;

  const getTitle = (item) => item.title || item.name;
  const getPoster = (item) => item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : "https://via.placeholder.com/500x750?text=No+Image";
  const getBackdrop = (item) => item.backdrop_path
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
    : null;
  const getYear = (item) => {
    const d = item.release_date || item.first_air_date;
    return d ? new Date(d).getFullYear() : "N/A";
  };

  const heroMovie = movies.length > 0 ? movies[0] : null;

  return (
    <div className="app-container">

      {/* ── Adblock Notice ── */}
      {showAdblockBanner && (
        <div className="adblock-banner">
          <div className="adblock-banner-content">
            <span className="adblock-icon">🛡️</span>
            <div className="adblock-text">
              <strong>Heads up</strong>
              <span>The video player may redirect to ad sites when clicked. We strongly recommend installing an ad blocker before watching.</span>
            </div>
            <div className="adblock-actions">
              <a
                href="https://ublockorigin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="adblock-link-btn"
              >
                Get uBlock Origin ↗
              </a>
              <button className="adblock-dismiss" onClick={dismissAdblockBanner} aria-label="Dismiss">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <header>
        <h1>Marsflix</h1>

        <div className="header-controls">
          {/* Movie / TV Toggle */}
          <div className="type-toggle">
            <button
              className={`toggle-btn ${mediaType === "movie" ? "active" : ""}`}
              onClick={() => handleMediaTypeSwitch("movie")}
            >
              Movies
            </button>
            <button
              className={`toggle-btn ${mediaType === "tv" ? "active" : ""}`}
              onClick={() => handleMediaTypeSwitch("tv")}
            >
              TV
            </button>
          </div>

          {/* Search Bar */}
          <div className="search-wrapper">
            <span className="search-icon">
              {loading && searchQuery ? (
                <span className="spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              )}
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search ${mediaType === "movie" ? "movies" : "TV shows"}…`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              autoComplete="off"
              spellCheck="false"
            />
            {searchQuery && (
              <button className="clear-btn" onClick={handleClear} aria-label="Clear search">
                ×
              </button>
            )}
            <span className="search-shortcut">/</span>
          </div>
        </div>
      </header>

      {loading && movies.length === 0 ? (
        <div className="loading-screen">
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        </div>
      ) : (
        <>
          {/* HERO */}
          {heroMovie && getBackdrop(heroMovie) && !searchQuery && (
            <div
              className="hero-card"
              style={{ backgroundImage: `url(${getBackdrop(heroMovie)})` }}
              onClick={() => handleMovieClick(heroMovie)}
            >
              <div className="hero-overlay">
                <div className="hero-badge">{mediaType === "movie" ? "🎬 Movie" : "📺 Series"}</div>
                <h2>{getTitle(heroMovie)}</h2>
                <p>{heroMovie.overview}</p>
                <button className="watch-now-btn">▶ Watch Now</button>
              </div>
            </div>
          )}

          {/* Results label */}
          <div className="results-bar">
            <span className="results-label">{resultsLabel}</span>
            <span className="results-count">{movies.length} titles</span>
          </div>

          {/* Grid */}
          {movies.length === 0 ? (
            <div className="empty-state">
              <p>No results for <strong>"{searchQuery}"</strong></p>
              <button onClick={handleClear}>Clear search</button>
            </div>
          ) : (
            <div className="movie-grid">
              {movies.map((movie) => (
                <div
                  key={movie.id}
                  className="movie-card"
                  onClick={() => handleMovieClick(movie)}
                >
                  <img src={getPoster(movie)} alt={getTitle(movie)} loading="lazy" />
                  <div className="card-info">
                    <span className="card-title">{getTitle(movie)}</span>
                    <span className="card-year">{getYear(movie)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL */}
      {selectedMovie && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>×</button>

            <div className="modal-header">
              <h2>{getTitle(selectedMovie)}</h2>
              <div className="movie-meta">
                <span>{getYear(selectedMovie)}</span>
                <span className="dot">·</span>
                <span>⭐ {selectedMovie.vote_average?.toFixed(1)}</span>
                <span className="dot">·</span>
                <span className="meta-type">{mediaType === "movie" ? "Movie" : "TV Show"}</span>
              </div>
            </div>

            <div className="player-container">
              <iframe
                src={getPlayerUrl(selectedMovie.id, mediaType)}
                width="100%"
                height="500"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; encrypted-media"
                title={getTitle(selectedMovie)}
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