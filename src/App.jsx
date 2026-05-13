import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import {
  getPopularMovies, getPopularTV,
  searchMovies, searchTV, searchAll,
  getMovieGenres, getTVGenres,
  discoverMovies, discoverTV,
  getTVDetails,
} from './services/api'

// ── Embed sources ────────────────────────────────────────────────
const getSources = (id, type, season, episode) =>
  type === "tv"
    ? [
        { label: "Source 1", url: `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}` },
        { label: "Source 2", url: `https://embed.su/embed/tv/${id}/${season}/${episode}` },
        { label: "Source 3", url: `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}` },
        { label: "Source 4", url: `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${season}&episode=${episode}` },
      ]
    : [
        { label: "Source 1", url: `https://vidsrc.me/embed/movie?tmdb=${id}` },
        { label: "Source 2", url: `https://embed.su/embed/movie/${id}` },
        { label: "Source 3", url: `https://multiembed.mov/?video_id=${id}&tmdb=1` },
        { label: "Source 4", url: `https://vidsrc.xyz/embed/movie?tmdb=${id}` },
      ];

// ── Player ───────────────────────────────────────────────────────
function Player({ movieId, mediaType, season, episode }) {
  const [sourceIdx, setSourceIdx] = useState(0);
  const sources = getSources(movieId, mediaType, season, episode);
  useEffect(() => { setSourceIdx(0); }, [movieId, season, episode]);
  return (
    <div className="player-wrap">
      <div className="source-tabs">
        {sources.map((s, i) => (
          <button
            key={i}
            className={`source-tab ${sourceIdx === i ? "source-tab-active" : ""}`}
            onClick={() => setSourceIdx(i)}
          >
            {s.label}
          </button>
        ))}
        <span className="source-hint">Not working? Try another source →</span>
      </div>
      <div className="player-container">
        <iframe
          key={`${movieId}-${season}-${episode}-${sourceIdx}`}
          src={sources[sourceIdx].url}
          width="100%"
          height="500"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          title="Player"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

function App() {
  const [movies, setMovies]               = useState([]);
  const [searchQuery, setSearchQuery]     = useState("");
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  // mediaType: "movie" | "tv" | "all"
  const [mediaType, setMediaType]         = useState("all");
  const [resultsLabel, setResultsLabel]   = useState("");
  const [genres, setGenres]               = useState([]);
  const [activeGenre, setActiveGenre]     = useState(null);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [showAdblockBanner, setShowAdblockBanner] = useState(false);
  const [tvDetails, setTvDetails]         = useState(null);
  const [selectedSeason, setSelectedSeason]   = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  // For modal: which media type is the selected item
  const [selectedMediaType, setSelectedMediaType] = useState("movie");

  const debounceTimer  = useRef(null);
  const searchInputRef = useRef(null);
  const genreDropRef   = useRef(null);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("adblock-dismissed");
    if (!dismissed) setShowAdblockBanner(true);
  }, []);
  const dismissAdblockBanner = () => {
    sessionStorage.setItem("adblock-dismissed", "1");
    setShowAdblockBanner(false);
  };

  // Load genres when mediaType changes (not for "all")
  useEffect(() => {
    const load = async () => {
      if (mediaType === "all") {
        setGenres([]);
      } else {
        const list = mediaType === "movie" ? await getMovieGenres() : await getTVGenres();
        setGenres(Array.isArray(list) ? list : []);
      }
    };
    load();
    setActiveGenre(null);
  }, [mediaType]);

  const fetchContent = useCallback(async (query, type, genreId, currentGenres, pageNum = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    let results = [];
    let pages = 1;

    if (query.trim()) {
      // Search mode
      if (type === "all") {
        const data = await searchAll(query, pageNum);
        results = data.results;
        pages = data.totalPages;
        setResultsLabel(`Results for "${query}"`);
      } else if (type === "movie") {
        const data = await searchMovies(query, pageNum);
        results = data.results.map(m => ({ ...m, _mediaType: 'movie' }));
        pages = data.totalPages;
        setResultsLabel(`Movies: "${query}"`);
      } else {
        const data = await searchTV(query, pageNum);
        results = data.results.map(t => ({ ...t, _mediaType: 'tv' }));
        pages = data.totalPages;
        setResultsLabel(`TV Shows: "${query}"`);
      }
    } else if (genreId) {
      const genre = (currentGenres || []).find(g => g.id === genreId);
      const label = genre?.name ?? "Browse";
      if (type === "movie") {
        const data = await discoverMovies(genreId, pageNum);
        results = data.results.map(m => ({ ...m, _mediaType: 'movie' }));
        pages = data.totalPages;
        setResultsLabel(`${label} Movies`);
      } else if (type === "tv") {
        const data = await discoverTV(genreId, pageNum);
        results = data.results.map(t => ({ ...t, _mediaType: 'tv' }));
        pages = data.totalPages;
        setResultsLabel(`${label} TV Shows`);
      }
    } else {
      // Popular / home
      if (type === "all") {
        const [mv, tv] = await Promise.all([
          getPopularMovies(pageNum),
          getPopularTV(pageNum),
        ]);
        const tagged = [
          ...mv.results.map(m => ({ ...m, _mediaType: 'movie' })),
          ...tv.results.map(t => ({ ...t, _mediaType: 'tv' })),
        ].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
        results = tagged;
        pages = Math.max(mv.totalPages, tv.totalPages);
        setResultsLabel("Popular — Movies & TV");
      } else if (type === "movie") {
        const data = await getPopularMovies(pageNum);
        results = data.results.map(m => ({ ...m, _mediaType: 'movie' }));
        pages = data.totalPages;
        setResultsLabel("Popular Movies");
      } else {
        const data = await getPopularTV(pageNum);
        results = data.results.map(t => ({ ...t, _mediaType: 'tv' }));
        pages = data.totalPages;
        setResultsLabel("Popular TV Shows");
      }
    }

    setTotalPages(pages);
    if (append) {
      setMovies(prev => [...prev, ...results]);
    } else {
      setMovies(results);
    }
    setLoading(false);
    setLoadingMore(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchContent("", "all", null, [], 1, false);
  }, []);

  // Debounced re-fetch when search/type/genre changes
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      fetchContent(searchQuery, mediaType, activeGenre, genres, 1, false);
    }, 400);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery, mediaType, activeGenre]);

  // Load more
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchContent(searchQuery, mediaType, activeGenre, genres, nextPage, true);
  };

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
    setMediaType("all");
    setPage(1);
    fetchContent("", "all", null, [], 1, false);
  };

  const switchType = (type) => {
    setMediaType(type);
    setActiveGenre(null);
    setSearchQuery("");
    setPage(1);
  };

  const selectGenre = (id) => {
    setActiveGenre(id);
    setSearchQuery("");
    setGenreDropdownOpen(false);
    setPage(1);
  };

  const handleClear = () => {
    setSearchQuery("");
    setActiveGenre(null);
    setPage(1);
    searchInputRef.current?.focus();
  };

  const handleMovieClick = async (movie) => {
    // _mediaType is tagged on items; fall back to current mediaType if not "all"
    const itemType = movie._mediaType ?? (mediaType !== "all" ? mediaType : "movie");
    setSelectedMediaType(itemType);
    setSelectedMovie(movie);
    setSelectedSeason(1);
    setSelectedEpisode(1);
    setTvDetails(null);
    if (itemType === "tv") {
      const details = await getTVDetails(movie.id);
      setTvDetails(details);
    }
  };

  const closeModal = () => {
    setSelectedMovie(null);
    setTvDetails(null);
  };

  const getTitle    = (i) => i?.title || i?.name || "";
  const getPoster   = (i) => i?.poster_path
    ? `https://image.tmdb.org/t/p/w500${i.poster_path}`
    : "https://via.placeholder.com/500x750?text=No+Image";
  const getBackdrop = (i) => i?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${i.backdrop_path}`
    : null;
  const getYear     = (i) => {
    const d = i?.release_date || i?.first_air_date;
    return d ? new Date(d).getFullYear() : "N/A";
  };

  const heroMovie = movies[0] ?? null;
  const numSeasons = tvDetails?.number_of_seasons ?? 1;
  const episodesInSeason = tvDetails?.seasons?.find(s => s.season_number === selectedSeason)?.episode_count ?? 24;

  const hasMore = page < totalPages;

  // Badge label for a card
  const getTypeBadge = (movie) => {
    const t = movie._mediaType;
    if (t === "movie") return "🎬";
    if (t === "tv") return "📺";
    return "";
  };

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
          <button
            className={`nav-link ${mediaType === "all" && !activeGenre && !searchQuery ? "nav-active" : ""}`}
            onClick={() => switchType("all")}
          >
            All
          </button>
          <button
            className={`nav-link ${mediaType === "movie" && !activeGenre && !searchQuery ? "nav-active" : ""}`}
            onClick={() => switchType("movie")}
          >
            Movies
          </button>
          <button
            className={`nav-link ${mediaType === "tv" && !activeGenre && !searchQuery ? "nav-active" : ""}`}
            onClick={() => switchType("tv")}
          >
            TV Shows
          </button>

          {/* Genres only relevant when a specific type is selected */}
          {mediaType !== "all" && (
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
          )}
        </nav>

        <div className="search-wrapper">
          <span className="search-icon">
            {loading && searchQuery ? (
              <span className="spinner" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            )}
          </span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder={
              mediaType === "all"
                ? "Search movies & TV…"
                : mediaType === "movie"
                ? "Search movies…"
                : "Search TV shows…"
            }
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
                <div className="hero-badge">
                  {heroMovie._mediaType === "tv" ? "📺 Series" : "🎬 Movie"}
                </div>
                <h2>{getTitle(heroMovie)}</h2>
                <p>{heroMovie.overview}</p>
                <button className="watch-now-btn">▶ Watch Now</button>
              </div>
            </div>
          )}

          <div className="results-bar">
            <span className="results-label">{resultsLabel}</span>
            <span className="results-count">{movies.length} titles{hasMore ? "+" : ""}</span>
          </div>

          {movies.length === 0 ? (
            <div className="empty-state">
              <p>No results for <strong>"{searchQuery}"</strong></p>
              <button onClick={handleClear}>Clear search</button>
            </div>
          ) : (
            <>
              <div className="movie-grid">
                {movies.map((movie, idx) => (
                  <div key={`${movie.id}-${movie._mediaType}-${idx}`} className="movie-card" onClick={() => handleMovieClick(movie)}>
                    <img src={getPoster(movie)} alt={getTitle(movie)} loading="lazy" />
                    {/* Show type badge only in "all" mode */}
                    {mediaType === "all" && (
                      <span className="card-type-badge">{getTypeBadge(movie)}</span>
                    )}
                    <div className="card-info">
                      <span className="card-title">{getTitle(movie)}</span>
                      <span className="card-year">{getYear(movie)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="load-more-wrap">
                  <button
                    className="load-more-btn"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <span className="load-more-spinner" />
                    ) : (
                      `Load More`
                    )}
                  </button>
                  <span className="load-more-hint">Page {page} of {totalPages}</span>
                </div>
              )}
            </>
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
                <span className="meta-type">{selectedMediaType === "movie" ? "Movie" : "TV Show"}</span>
              </div>
            </div>

            {selectedMediaType === "tv" && (
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

            <Player
              movieId={selectedMovie.id}
              mediaType={selectedMediaType}
              season={selectedSeason}
              episode={selectedEpisode}
            />

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