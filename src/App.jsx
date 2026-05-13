import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import {
  getPopularMovies, getPopularTV,
  searchMovies, searchTV,
  getMovieGenres, getTVGenres,
  discoverMovies, discoverTV,
  getTVDetails,
} from './services/api'

function App() {
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [mediaType, setMediaType] = useState("movie");
  const [resultsLabel, setResultsLabel] = useState("");
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [showAdblockBanner, setShowAdblockBanner] = useState(false);
  const [tvDetails, setTvDetails] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  const debounceTimer = useRef(null);
  const searchInputRef = useRef(null);
  const genreDropRef = useRef(null);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("adblock-dismissed");
    if (!dismissed) setShowAdblockBanner(true);
  }, []);
  const dismissAdblockBanner = () => {
    sessionStorage.setItem("adblock-dismissed", "1");
    setShowAdblockBanner(false);
  };

  useEffect(() => {
    const load = async () => {
      const list = mediaType === "movie" ? await getMovieGenres() : await getTVGenres();
      setGenres(Array.isArray(list) ? list : []);
    };
    load();
    setActiveGenre(null);
  }, [mediaType]);

  const fetchContent = useCallback(async (query, type, genreId, currentGenres) => {
    setLoading(true);
    let results;
    if (query.trim()) {
      results = type === "movie" ? await searchMovies(query) : await searchTV(query);
      setResultsLabel(`Results for "${query}"`);
    } else if (genreId) {
      const genre = (currentGenres || []).find(g => g.id === genreId);
      results = type === "movie" ? await discoverMovies(genreId) : await discoverTV(genreId);
      setResultsLabel(genre ? `${genre.name} ${type === "movie" ? "Movies" : "TV Shows"}` : "Browse");
    } else {
      results = type === "movie" ? await getPopularMovies() : await getPopularTV();
      setResultsLabel(type === "movie" ? "Popular Movies" : "Popular TV Shows");
    }
    setMovies(results);
    setLoading(false);
  }, []);

  useEffect(() => { fetchContent("", "movie", null, []); }, []);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchContent(searchQuery, mediaType, activeGenre, genres);
    }, 400);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery, mediaType, activeGenre, genres, fetchContent]);

  useEffect(() => {
    const handler = (e) => {
      if (genreDropRef.current && !genreDropRef.current.contains(e.target))
        setGenreDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (selectedMovie) setSelectedMovie(null);
        else setGenreDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedMovie]);

  const goHome = () => {
    setSearchQuery("");
    setActiveGenre(null);
    setMediaType("movie");
    fetchContent("", "movie", null, []);
  };

  const switchType = (type) => {
    setMediaType(type);
    setActiveGenre(null);
    setSearchQuery("");
  };

  const selectGenre = (id) => {
    setActiveGenre(id);
    setSearchQuery("");
    setGenreDropdownOpen(false);
  };

  const handleClear = () => {
    setSearchQuery("");
    setActiveGenre(null);
    searchInputRef.current?.focus();
  };

  const handleMovieClick = async (movie) => {
    setSelectedMovie(movie);
    setSelectedSeason(1);
    setSelectedEpisode(1);
    setTvDetails(null);
    if (mediaType === "tv") {
      const details = await getTVDetails(movie.id);
      setTvDetails(details);
    }
  };

  const closeModal = () => {
    setSelectedMovie(null);
    setTvDetails(null);
  };

  const getPlayerUrl = (id, type, season = 1, episode = 1) =>
    type === "tv"
      ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`
      : `https://vidsrc.me/embed/movie?tmdb=${id}`;

  const getTitle = (i) => i?.title || i?.name || "";
  const getPoster = (i) => i?.poster_path
    ? `https://image.tmdb.org/t/p/w500${i.poster_path}`
    : "https://via.placeholder.com/500x750?text=No+Image";
  const getBackdrop = (i) => i?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${i.backdrop_path}`
    : null;
  const getYear = (i) => {
    const d = i?.release_date || i?.first_air_date;
    return d ? new Date(d).getFullYear() : "N/A";
  };

  const heroMovie = movies[0] ?? null;
  const numSeasons = tvDetails?.number_of_seasons ?? 1;
  const episodesInSeason = tvDetails?.seasons?.find(s => s.season_number === selectedSeason)?.episode_count ?? 12;

  return (
    <div className="app-container">

      {showAdblockBanner && (
        <div className="adblock-banner">
          <div className="adblock-banner-content">
            <span className="adblock-icon">🛡️</span>
            <div className="adblock-text">
              <strong>Heads up</strong>
              <span>The video player may redirect to ad sites. We strongly recommend installing an ad blocker before watching.</span>
            </div>
            <div className="adblock-actions">
              <a href="https://ublockorigin.com" target="_blank" rel="noopener noreferrer" className="adblock-link-btn">
                Get uBlock Origin ↗
              </a>
              <button className="adblock-dismiss" onClick={dismissAdblockBanner} aria-label="Dismiss">✕</button>
            </div>
          </div>
        </div>
      )}

      <header>
        <h1 onClick={goHome}>Marsflix</h1>

        <nav className="main-nav">
          <button className={`nav-link ${mediaType === "movie" && !activeGenre && !searchQuery ? "nav-active" : ""}`} onClick={() => switchType("movie")}>
            Movies
          </button>
          <button className={`nav-link ${mediaType === "tv" && !activeGenre && !searchQuery ? "nav-active" : ""}`} onClick={() => switchType("tv")}>
            TV Shows
          </button>

          <div className="genre-dropdown-wrap" ref={genreDropRef}>
            <button
              className={`nav-link genre-trigger ${activeGenre ? "nav-active" : ""}`}
              onClick={() => setGenreDropdownOpen(o => !o)}
            >
              {activeGenre ? genres.find(g => g.id === activeGenre)?.name ?? "Genres" : "Genres"}
              <span className={`caret ${genreDropdownOpen ? "open" : ""}`}>▾</span>
            </button>
            {genreDropdownOpen && (
              <div className="genre-dropdown">
                {activeGenre && (
                  <button className="genre-item genre-clear" onClick={() => selectGenre(null)}>
                    ✕ Clear filter
                  </button>
                )}
                {genres.map(g => (
                  <button
                    key={g.id}
                    className={`genre-item ${activeGenre === g.id ? "genre-item-active" : ""}`}
                    onClick={() => selectGenre(g.id)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="search-wrapper">
          <span className="search-icon">
            {loading && searchQuery ? (
              <span className="spinner" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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
            <button className="clear-btn" onClick={handleClear} aria-label="Clear">×</button>
          )}
          <span className="search-shortcut">/</span>
        </div>
      </header>

      {loading && movies.length === 0 ? (
        <div className="loading-screen">
          <div className="loading-dots"><span /><span /><span /></div>
        </div>
      ) : (
        <>
          {heroMovie && getBackdrop(heroMovie) && !searchQuery && !activeGenre && (
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

          <div className="results-bar">
            <span className="results-label">{resultsLabel}</span>
            <span className="results-count">{movies.length} titles</span>
          </div>

          {movies.length === 0 ? (
            <div className="empty-state">
              <p>No results for <strong>"{searchQuery}"</strong></p>
              <button onClick={handleClear}>Clear search</button>
            </div>
          ) : (
            <div className="movie-grid">
              {movies.map((movie) => (
                <div key={movie.id} className="movie-card" onClick={() => handleMovieClick(movie)}>
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

            {mediaType === "tv" && (
              <div className="episode-picker">
                <div className="picker-group">
                  <label>Season</label>
                  <select value={selectedSeason} onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }}>
                    {Array.from({ length: numSeasons }, (_, i) => i + 1).map(s => (
                      <option key={s} value={s}>Season {s}</option>
                    ))}
                  </select>
                </div>
                <div className="picker-group">
                  <label>Episode</label>
                  <select value={selectedEpisode} onChange={(e) => setSelectedEpisode(Number(e.target.value))}>
                    {Array.from({ length: episodesInSeason }, (_, i) => i + 1).map(ep => (
                      <option key={ep} value={ep}>Episode {ep}</option>
                    ))}
                  </select>
                </div>
                {tvDetails && (
                  <span className="season-info">
                    {numSeasons} season{numSeasons !== 1 ? "s" : ""} · {tvDetails.number_of_episodes} eps total
                  </span>
                )}
              </div>
            )}

            <div className="player-container">
              <iframe
                key={`${selectedMovie.id}-${selectedSeason}-${selectedEpisode}`}
                src={getPlayerUrl(selectedMovie.id, mediaType, selectedSeason, selectedEpisode)}
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