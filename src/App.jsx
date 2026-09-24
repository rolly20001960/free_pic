import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, '')

const readStorage = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback
  } catch {
    return fallback
  }
}

function App() {
  const [images, setImages] = useState([])
  const [favorites, setFavorites] = useState(() => readStorage('lumi-favorites', []))
  const [likes, setLikes] = useState(() => readStorage('lumi-likes', []))
  const [comments, setComments] = useState(() => readStorage('lumi-comments', {}))
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState('all')
  const [limit, setLimit] = useState(8)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`${API_URL}/api/images?limit=30`)
      .then(({ data }) => setImages(data.map((image, index) => ({ id: index + 1, image }))))
      .catch(() => setError("Impossible de charger les images depuis l'API."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => localStorage.setItem('lumi-favorites', JSON.stringify(favorites)), [favorites])
  useEffect(() => localStorage.setItem('lumi-likes', JSON.stringify(likes)), [likes])
  useEffect(() => localStorage.setItem('lumi-comments', JSON.stringify(comments)), [comments])

  useEffect(() => {
    const preventDownload = (event) => {
      if (event.target.closest('img')) event.preventDefault()
    }
    document.addEventListener('contextmenu', preventDownload)
    document.addEventListener('dragstart', preventDownload)
    return () => {
      document.removeEventListener('contextmenu', preventDownload)
      document.removeEventListener('dragstart', preventDownload)
    }
  }, [])

  const toggle = (items, setItems, id) => setItems(items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  const filteredImages = useMemo(() => images.filter(({ id }) => (view === 'favorites' ? favorites.includes(id) : true) && String(id).includes(query.trim())), [images, view, favorites, query])
  const pageCount = Math.max(1, Math.ceil(filteredImages.length / limit))
  const visibleImages = filteredImages.slice((page - 1) * limit, page * limit)

  return (
    <div className="app">
      <header className="nav">
        <a className="logo" href="/" aria-label="Lumi accueil"><span className="logo-mark">L</span> lumi</a>
        <nav className="nav-links" aria-label="Navigation principale">
          <button className={view === 'all' ? 'active' : ''} onClick={() => { setView('all'); setPage(1) }}>Accueil</button>
          <button className={view === 'favorites' ? 'active' : ''} onClick={() => { setView('favorites'); setPage(1) }}>Favoris <small>{favorites.length}</small></button>
        </nav>
        <div className="profile">VP</div>
      </header>

      <main>
        <section className="hero-copy">
          <div><p className="kicker">COLLECTION VISUELLE · 2026</p><h1>Images that<br /><i>stay with you.</i></h1></div>
          <p className="hero-note">Une sélection de photographies pour nourrir vos idées, vos références et vos moments de calme.</p>
        </section>

        <section className="toolbar" aria-label="Outils de galerie">
          <label className="search"><span>⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Rechercher par numéro..." aria-label="Rechercher une image" /></label>
          <label className="limit">Afficher <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1) }}><option value="4">4</option><option value="8">8</option><option value="12">12</option></select> par page</label>
          <span className="count">{filteredImages.length} images</span>
        </section>

        {error && <p className="notice" role="alert">{error}</p>}
        {loading ? <div className="loading-grid">{Array.from({ length: limit }, (_, index) => <div key={index} />)}</div> : (
          <section className="gallery" aria-label="Galerie d'images">
            {visibleImages.map(({ id, image }) => <PhotoCard key={id} id={id} image={image} favorite={favorites.includes(id)} comments={comments[id]?.length || 0} onOpen={() => setSelected({ id, image })} onFavorite={() => toggle(favorites, setFavorites, id)} />)}
          </section>
        )}
        {!loading && filteredImages.length === 0 && <div className="empty">Aucun résultat dans cette vue.</div>}
        {!loading && pageCount > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>←</button><span>Page {page} / {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage(page + 1)}>→</button></div>}
      </main>

      {selected && <Detail image={selected} liked={likes.includes(selected.id)} favorite={favorites.includes(selected.id)} onClose={() => setSelected(null)} onLike={() => toggle(likes, setLikes, selected.id)} onFavorite={() => toggle(favorites, setFavorites, selected.id)} comments={comments[selected.id] || []} onComment={(text) => setComments({ ...comments, [selected.id]: [...(comments[selected.id] || []), text] })} />}
    </div>
  )
}

function PhotoCard({ id, image, favorite, comments, onOpen, onFavorite }) {
  return <article className="photo-card"><button className="photo-button" onClick={onOpen} aria-label={`Ouvrir l'image ${id}`}><img src={image} alt={`Photographie numéro ${id}`} draggable="false" loading="lazy" /></button><div className="photo-meta"><span>NO. {String(id).padStart(2, '0')}</span><div className="photo-actions"><button onClick={onOpen} aria-label={`Voir les commentaires de l'image ${id}`}>▱ {comments}</button><button onClick={onFavorite} className={favorite ? 'saved' : ''} aria-label="Ajouter aux favoris">{favorite ? '♥' : '♡'}</button></div></div></article>
}

function Detail({ image, liked, favorite, onClose, onLike, onFavorite, comments, onComment }) {
  const [text, setText] = useState('')
  const submit = (event) => { event.preventDefault(); if (text.trim()) { onComment(text.trim()); setText('') } }
  return <div className="modal-backdrop" onClick={onClose}><section className="detail" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Détail de l'image"><button className="close" onClick={onClose} aria-label="Fermer">×</button><img className="detail-image" src={image.image} alt={`Photographie numéro ${image.id}`} draggable="false" /><div className="detail-body"><div className="detail-heading"><div><p className="kicker">NO. {String(image.id).padStart(2, '0')}</p><h2>Quiet study</h2></div><div className="detail-actions"><button className={liked ? 'like liked' : 'like'} onClick={onLike}>{liked ? '♥' : '♡'} <span>J’aime</span></button><button className={favorite ? 'like liked' : 'like'} onClick={onFavorite}>{favorite ? '★' : '☆'} <span>Favori</span></button></div></div><div className="comments"><p className="kicker">COMMENTAIRES · {comments.length}</p>{comments.length === 0 && <p className="comment-empty">Soyez le premier à laisser un commentaire.</p>}{comments.map((comment, index) => <p className="comment" key={`${comment}-${index}`}>{comment}</p>)}</div><form className="comment-form" onSubmit={submit}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Ajouter un commentaire..." /><button>Publier</button></form></div></section></div>
}

export default App
