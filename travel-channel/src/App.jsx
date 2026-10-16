import { useEffect, useMemo, useRef, useState } from 'react';
import { saveImages, getImages, deleteImages } from './db';

/* ───────── Настройки ───────── */
const _AUTHOR_PASSWORD = 'travel2026'; // поменяйте. Это только фронтенд — для продакшена нужен бэкенд
const SITE = {
  name: 'Заметки с дороги',
  about: 'Я начинающий блогер. Пишу про Самарканд, Турцию и всё, что увидел по пути.',
};
const DEFAULT_PROFILE = {
  name: 'Асрор',
  city: 'Ташкент',
  telegram: '',
  bio: 'Я начинающий блогер. Езжу по Узбекистану и Турции, снимаю на телефон и пишу о том, что понравилось (и что не очень). Блог только начинается, так что буду рад любым советам по маршрутам.',
  avatar: null,
};

/* Фото с Wikimedia Commons (Special:FilePath отдаёт нужный размер).
   Если фото не загрузится, подставится картинка-заглушка с названием места. */
const LABELS = {};
const commons = (file, w) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=${w}`;
const ph = (file, label) => {
  const full = commons(file, 1600);
  const thumb = commons(file, 700);
  LABELS[full] = LABELS[thumb] = label;
  return { full, thumb };
};
const P = {
  registan: ph('Registan three madrasahs Samarkand.jpg', 'Регистан, Самарканд'),
  sherdor: ph('Registan - Sherdor madrasa.jpg', 'Медресе Шердор'),
  night: ph('Registan square at night Samarkand.jpg', 'Регистан вечером'),
  shah: ph('Gorskii 03978u.jpg', 'Шахи-Зинда'),
  bibi: ph('Samarkand view from the top.jpg', 'Бибиханым, Самарканд'),
  balloon: ph('Cappadocia Balloon Inflating Wikimedia Commons.JPG', 'Каппадокия'),
  hagia: ph('Hagia Sophia Mars 2013.jpg', 'Айя-София, Стамбул'),
  pamuk: ph('TR Pamukkale White Terraces asv2020-02 img16.jpg', 'Памуккале'),
  pamuk2: ph('Pamukkale 12.jpg', 'Памуккале'),
};
const CREDIT = 'Фото пока с Wikimedia Commons (свободные лицензии). Потом заменю на свои.';
const day = 86400000;
const SEED = [
  {
    id: 'samarkand-registan',
    title: 'Самарканд: два дня и один Регистан',
    text: 'Поехал в Самарканд на скоростном поезде из Ташкента. Дорога заняла около двух часов, я даже не успел заскучать.\n\nНа Регистан пошёл сразу, как заселился, вещи толком не разобрал. Три медресе стоят вокруг площади и выглядят так, будто их покрасили вчера. Сначала снимал всё подряд, потом понял, что лучше просто постоять минут десять и посмотреть.\n\nВечером включили подсветку, и площадь стала совсем другой. Людей много, но не толкаются. Это мой первый нормальный пост, так что не судите строго :)',
    images: [P.registan.full, P.sherdor.full, P.night.full],
    cover: P.registan.thumb,
    count: 3,
    credit: CREDIT,
    ts: Date.now() - 1 * day,
    views: 0,
    likes: 0,
    comments: [],
  },
  {
    id: 'samarkand-shahi-zinda',
    title: 'Шахи-Зинда рано утром',
    text: 'Пришёл к открытию, пока нет экскурсий. Узкая улочка из мавзолеев, и почти на каждом синяя плитка с узорами. Идёшь медленно и всё время поднимаешь голову.\n\nЭто не просто красивое место, сюда приходят молиться, поэтому я оделся скромно и говорил тише. Фотографировать можно, но без фанатизма.\n\nНа снимке старое фото места, а мои пока лежат на телефоне, разберу на днях.',
    images: [P.shah.full],
    cover: P.shah.thumb,
    count: 1,
    credit: CREDIT,
    ts: Date.now() - 4 * day,
    views: 0,
    likes: 0,
    comments: [],
  },
  {
    id: 'samarkand-bibi-siab',
    title: 'Бибиханым и базар Сиаб',
    text: 'Мечеть Бибиханым огромная. Часть её восстановлена, часть до сих пор как будто в процессе, и мне это даже понравилось, видно, какой она была.\n\nНапротив базар Сиаб. Купил самаркандскую лепёшку, тёплую, с узором посередине, и самсу прямо у прилавка. Немного поторговался за сухофрукты, продавец смеялся, но цену скинул.\n\nСовет простой: приходите на базар голодными.',
    images: [P.bibi.full],
    cover: P.bibi.thumb,
    count: 1,
    credit: CREDIT,
    ts: Date.now() - 8 * day,
    views: 0,
    likes: 0,
    comments: [],
  },
  {
    id: 'turkey-cappadocia',
    title: 'Каппадокия: шар на рассвете',
    text: 'Подъём в четыре утра, и я до сих пор не понимаю, как встал. На улице холодно, все сонные, но когда начали надувать шар, сон пропал.\n\nСтоишь внутри, горелка гудит, и тебя обдаёт жаром. Потом взлетаешь, и долины внизу как с другой планеты. Летали примерно час.\n\nПолёты иногда отменяют из-за ветра, нам повезло. Если едете, закладывайте в план запасной день.',
    images: [P.balloon.full],
    cover: P.balloon.thumb,
    count: 1,
    credit: CREDIT,
    ts: Date.now() - 14 * day,
    views: 0,
    likes: 0,
    comments: [],
  },
  {
    id: 'turkey-istanbul',
    title: 'Стамбул: первый день',
    text: 'Прилетел, бросил сумку и сразу на паром через Босфор. Взял симит и чай в маленьком стаканчике, сидел на палубе и думал, что вот это и есть отпуск.\n\nАйя-Софию сначала увидел снаружи, вокруг толпа, но она всё равно впечатляет. За день набегал столько, что к вечеру не чувствовал ног. Берите удобную обувь, красивую оставьте для фото.',
    images: [P.hagia.full],
    cover: P.hagia.thumb,
    count: 1,
    credit: CREDIT,
    ts: Date.now() - 20 * day,
    views: 0,
    likes: 0,
    comments: [],
  },
  {
    id: 'turkey-pamukkale',
    title: 'Памуккале: белые террасы',
    text: 'Название переводится как «хлопковый замок», и издалека правда похоже на снег. Наверх идёшь босиком, в обуви нельзя, так что готовьтесь.\n\nВода в бассейнах тёплая, а камень скользкий, я один раз чуть не упал. Лучше приходить ближе к вечеру: жара спадает и закат красивый. Наверху ещё руины Иераполиса, на них я потратил больше времени, чем думал.',
    images: [P.pamuk.full, P.pamuk2.full],
    cover: P.pamuk.thumb,
    count: 2,
    credit: CREDIT,
    ts: Date.now() - 27 * day,
    views: 0,
    likes: 0,
    comments: [],
  },
];

/* ───────── Утилиты ───────── */
const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const plural = (n, [one, few, many]) => {
  const m = n % 100;
  const d = n % 10;
  return m > 10 && m < 20 ? many : d === 1 ? one : d > 1 && d < 5 ? few : many;
};
const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });
const ago = (ts) => {
  const s = Math.round((ts - Date.now()) / 1000);
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, sec] of units) if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), u);
  return 'только что';
};
const viewsLabel = (n) => `${n} ${plural(n, ['просмотр', 'просмотра', 'просмотров'])}`;

const fallback = (src) => {
  const label = LABELS[src] || '';
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd0dc"/><stop offset="1" stop-color="#f2e3c3"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="880" cy="230" r="80" fill="#f6d27a"/><path d="M0 560 L240 300 L430 520 L650 260 L900 540 L1200 340 V800 H0Z" fill="#4b7f8c"/><path d="M0 680 Q300 520 600 640 T1200 600 V800 H0Z" fill="#1f4a55"/>' +
    (label ? `<text x="600" y="740" text-anchor="middle" font-family="sans-serif" font-size="56" fill="#fff">${label}</text>` : '') +
    '</svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

function Img({ src, alt = '', ...rest }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  return <img src={bad ? fallback(src) : src} alt={alt} onError={() => setBad(true)} {...rest} />;
}

// Уменьшает картинку и возвращает dataURL (чтобы влезало в хранилище)
function resize(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('bad image'));
    };
    img.src = url;
  });
}
function shrink(dataUrl, max = 640) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function useRoute() {
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => {
    const onChange = () => {
      setHash(location.hash || '#/');
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  if (hash === '#/about') return { page: 'about' };
  const m = hash.match(/^#\/post\/(.+)$/);
  return m ? { page: 'post', id: m[1] } : { page: 'home' };
}

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('pt:theme', theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

function usePostImages(post) {
  const [images, setImages] = useState(post?.images || []);
  useEffect(() => {
    if (!post) return;
    if (post.images) return setImages(post.images);
    let dead = false;
    getImages(post.id).then((imgs) => !dead && setImages(imgs || []));
    return () => {
      dead = true;
    };
  }, [post?.id]);
  return images;
}

/* ───────── Компоненты ───────── */
function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark';
  return (
    <button className="btn icon-btn" onClick={onToggle} aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'} title={dark ? 'Светлая тема' : 'Тёмная тема'}>
      {dark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />
        </svg>
      )}
    </button>
  );
}

function Header({ page, theme, onTheme, author, onLogin, onLogout, onNew, q, setQ }) {
  return (
    <header className="header">
      <a className="logo" href="#/">
        {SITE.name}
      </a>
      <nav className="nav">
        <a href="#/" className={page !== 'about' ? 'active' : ''}>
          Записи
        </a>
        <a href="#/about" className={page === 'about' ? 'active' : ''}>
          Обо мне
        </a>
      </nav>
      <input
        className="search"
        type="search"
        placeholder="Поиск по записям"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (location.hash !== '#/') location.hash = '#/';
        }}
      />
      <div className="actions">
        <ThemeToggle theme={theme} onToggle={onTheme} />
        {author ? (
          <>
            <button className="btn btn-main" onClick={onNew}>
              Новая запись
            </button>
            <button className="btn" onClick={onLogout}>
              Выйти
            </button>
          </>
        ) : (
          <button className="btn" onClick={onLogin}>
            Я автор
          </button>
        )}
      </div>
    </header>
  );
}

function Avatar({ profile, size = 44 }) {
  return profile.avatar ? (
    <Img className="avatar-img" src={profile.avatar} style={{ width: size, height: size }} />
  ) : (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {profile.name[0]?.toUpperCase()}
    </div>
  );
}

function Card({ post, big }) {
  const cover = post.cover || post.images?.[0];
  const count = post.count ?? post.images?.length ?? 0;
  return (
    <a className={'card' + (big ? ' card-big' : '')} href={`#/post/${post.id}`}>
      <div className="thumb">
        {cover ? <Img src={cover} loading="lazy" /> : <div className="thumb-empty" />}
        {count > 1 && <span className="badge">{count} фото</span>}
      </div>
      <div className="card-body">
        <h3>{post.title}</h3>
        {big && post.text && <p className="excerpt">{post.text.slice(0, 160)}</p>}
        <p className="meta">
          {viewsLabel(post.views)}, {post.comments.length} {plural(post.comments.length, ['комментарий', 'комментария', 'комментариев'])}, {ago(post.ts)}
        </p>
      </div>
    </a>
  );
}

function Home({ posts, q }) {
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? posts.filter((p) => (p.title + ' ' + p.text).toLowerCase().includes(s)) : posts;
  }, [posts, q]);

  return (
    <>
      {!q && (
        <section className="hero">
          <h1>{SITE.name}</h1>
          <p>{SITE.about}</p>
          <svg className="route" viewBox="0 0 600 80" fill="none" aria-hidden="true">
            <path d="M4 60 C 90 10, 160 90, 250 45 S 420 5, 520 40 S 580 50, 596 20" />
            <circle cx="596" cy="20" r="6" />
          </svg>
        </section>
      )}
      {!list.length ? (
        <p className="empty">{q ? 'Ничего не нашлось. Попробуйте другое слово.' : 'Записей пока нет.'}</p>
      ) : (
        <div className="home-grid">
          {list.map((p, i) => (
            <Card key={p.id} post={p} big={!q && i === 0} />
          ))}
        </div>
      )}
    </>
  );
}

function About({ profile, posts, author, onEdit }) {
  const stats = [
    [posts.length, plural(posts.length, ['запись', 'записи', 'записей'])],
    [posts.reduce((a, p) => a + (p.count ?? p.images?.length ?? 0), 0), 'фото'],
    [posts.reduce((a, p) => a + p.views, 0), 'просмотров'],
    [posts.reduce((a, p) => a + p.likes, 0), 'лайков'],
  ];
  const tg = profile.telegram.replace(/^@/, '').trim();
  return (
    <div className="profile-page">
      <section className="profile">
        <Avatar profile={profile} size={140} />
        <div>
          <h1>{profile.name}</h1>
          {profile.city && <p className="meta">{profile.city}</p>}
          <p className="bio">{profile.bio}</p>
          <div className="profile-links">
            {tg && (
              <a className="btn" href={`https://t.me/${tg}`} target="_blank" rel="noreferrer">
                Telegram
              </a>
            )}
            {author && (
              <button className="btn btn-main" onClick={onEdit}>
                Редактировать профиль
              </button>
            )}
          </div>
        </div>
      </section>
      <dl className="stats">
        {stats.map(([n, label]) => (
          <div key={label}>
            <dt>{n}</dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
      <h2 className="section-title">Мои записи</h2>
      <div className="home-grid">
        {posts.map((p) => (
          <Card key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}

function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="overlay lightbox" onClick={onClose}>
      <Img src={src} />
    </div>
  );
}

function Post({ post, profile, author, liked, onLike, onComment, onDeleteComment, onDeletePost, onView }) {
  const images = usePostImages(post);
  const [zoom, setZoom] = useState(null);
  const [name, setName] = useState(() => localStorage.getItem('pt:name') || '');
  const [text, setText] = useState('');

  useEffect(() => {
    if (post && !sessionStorage.getItem('pt:seen:' + post.id)) {
      sessionStorage.setItem('pt:seen:' + post.id, '1');
      onView(post.id);
    }
  }, [post?.id]);

  if (!post)
    return (
      <p className="empty">
        Запись не найдена. <a href="#/">На главную</a>
      </p>
    );

  const isLiked = liked.includes(post.id);
  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const n = name.trim() || 'Гость';
    localStorage.setItem('pt:name', n);
    onComment(post.id, { id: crypto.randomUUID(), name: n, text: text.trim(), ts: Date.now() });
    setText('');
  };

  return (
    <article className="post">
      <a className="back" href="#/">
        ← Все записи
      </a>
      <h2 className="title">{post.title}</h2>
      <a className="byline" href="#/about">
        <Avatar profile={profile} size={32} />
        <span>{profile.name}</span>
      </a>
      <p className="meta">
        {viewsLabel(post.views)}, {ago(post.ts)}
      </p>

      <div className="gallery">
        {images.map((src, i) => (
          <Img key={i} src={src} onClick={() => setZoom(src)} />
        ))}
      </div>

      {post.credit && <p className="meta">{post.credit}</p>}

      {post.text && <p className="body">{post.text}</p>}

      <div className="row-actions">
        <button className={'btn like' + (isLiked ? ' on' : '')} onClick={() => onLike(post.id)} aria-pressed={isLiked}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M12 21s-7-4.6-9.5-9C.8 8.7 2.7 5 6.2 5c2 0 3.4 1 5.8 3.4C14.4 6 15.8 5 17.8 5c3.5 0 5.4 3.7 3.7 7-2.5 4.4-9.5 9-9.5 9z" />
          </svg>
          {post.likes}
        </button>
        {author && (
          <button className="btn btn-danger" onClick={() => onDeletePost(post.id)}>
            Удалить запись
          </button>
        )}
      </div>

      <section className="comments">
        <h3>
          {post.comments.length} {plural(post.comments.length, ['комментарий', 'комментария', 'комментариев'])}
        </h3>
        <form onSubmit={submit} className="comment-form">
          <input placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
          <textarea placeholder="Напишите комментарий" value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={2000} />
          <div className="comment-foot">
            <span className="meta">{text.length} / 2000</span>
            <button className="btn btn-main" disabled={!text.trim()}>
              Отправить
            </button>
          </div>
        </form>
        <ul>
          {post.comments.map((c) => (
            <li key={c.id}>
              <div className="avatar" style={{ width: 44, height: 44 }}>
                {c.name[0]?.toUpperCase()}
              </div>
              <div className="c-main">
                <p className="c-head">
                  <b>{c.name}</b> <span className="meta">{ago(c.ts)}</span>
                  {author && (
                    <button className="link-danger" onClick={() => onDeleteComment(post.id, c.id)}>
                      Удалить
                    </button>
                  )}
                </p>
                <p className="c-text">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </article>
  );
}

function Editor({ onClose, onDone }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef();

  const pick = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    setBusy(true);
    try {
      const done = await Promise.all(files.map((f) => resize(f)));
      setImages((prev) => [...prev, ...done]);
      setError('');
    } catch {
      setError('Один из файлов не удалось прочитать как картинку');
    }
    setBusy(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError('Введите заголовок');
    setBusy(true);
    try {
      const id = crypto.randomUUID();
      let cover = null;
      if (images.length) {
        await saveImages(id, images);
        cover = await shrink(images[0]);
      }
      onDone({ id, title: title.trim(), text: text.trim(), cover, count: images.length, ts: Date.now(), views: 0, likes: 0, comments: [] });
    } catch {
      setError('Не удалось сохранить запись');
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Новая запись</h2>
        <label>
          Заголовок
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </label>
        <label>
          Текст
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} />
        </label>
        <button type="button" className="drop" onClick={() => ref.current.click()} disabled={busy}>
          {busy ? 'Обрабатываем…' : 'Добавить фото'}
        </button>
        <input ref={ref} type="file" accept="image/*" multiple hidden onChange={pick} />
        {images.length > 0 && (
          <div className="previews">
            {images.map((src, i) => (
              <div key={i} className="preview">
                <img src={src} alt="" />
                <button type="button" aria-label="Убрать фото" onClick={() => setImages(images.filter((_, j) => j !== i))}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button className="btn btn-main" disabled={busy}>
            Опубликовать
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileEditor({ profile, onClose, onSave }) {
  const [form, setForm] = useState(profile);
  const [busy, setBusy] = useState(false);
  const ref = useRef();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pick = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      setForm({ ...form, avatar: await resize(f, 400) });
    } catch {}
    setBusy(false);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...form, name: form.name.trim() || 'Автор блога' });
        }}
      >
        <h2>Профиль</h2>
        <div className="avatar-edit">
          <Avatar profile={form} size={72} />
          <button type="button" className="btn" onClick={() => ref.current.click()} disabled={busy}>
            Загрузить фото
          </button>
          {form.avatar && (
            <button type="button" className="btn" onClick={() => setForm({ ...form, avatar: null })}>
              Убрать
            </button>
          )}
          <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
        </div>
        <label>
          Имя
          <input value={form.name} onChange={set('name')} maxLength={40} />
        </label>
        <label>
          Город
          <input value={form.city} onChange={set('city')} maxLength={40} />
        </label>
        <label>
          Telegram (без @)
          <input value={form.telegram} onChange={set('telegram')} maxLength={40} />
        </label>
        <label>
          О себе
          <textarea value={form.bio} onChange={set('bio')} rows={5} maxLength={600} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-main" disabled={busy}>
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}

/* ───────── Приложение ───────── */
export default function App() {
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const [posts, setPosts] = useState(() => load('pt:posts2', SEED));
  const [profile, setProfile] = useState(() => ({ ...DEFAULT_PROFILE, ...load('pt:profile2', {}) }));
  const [liked, setLiked] = useState(() => load('pt:liked', []));
  const [author, setAuthor] = useState(() => sessionStorage.getItem('pt:author') === '1');
  const [editing, setEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('pt:posts2', JSON.stringify(posts));
    } catch {
      alert('Хранилище браузера переполнено. Удалите старые записи.');
    }
  }, [posts]);
  useEffect(() => {
    try {
      localStorage.setItem('pt:profile2', JSON.stringify(profile));
    } catch {}
  }, [profile]);
  useEffect(() => localStorage.setItem('pt:liked', JSON.stringify(liked)), [liked]);

  const patch = (id, fn) => setPosts((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));

  const login = () => {
    const pass = prompt('Пароль автора');
    if (pass === null) return;
    if (pass === AUTHOR_PASSWORD) {
      sessionStorage.setItem('pt:author', '1');
      setAuthor(true);
    } else alert('Неверный пароль');
  };
  const logout = () => {
    sessionStorage.removeItem('pt:author');
    setAuthor(false);
  };

  const toggleLike = (id) => {
    const on = liked.includes(id);
    setLiked(on ? liked.filter((x) => x !== id) : [...liked, id]);
    patch(id, (p) => ({ ...p, likes: Math.max(0, p.likes + (on ? -1 : 1)) }));
  };
  const addComment = (id, c) => patch(id, (p) => ({ ...p, comments: [c, ...p.comments] }));
  const delComment = (id, cid) => patch(id, (p) => ({ ...p, comments: p.comments.filter((c) => c.id !== cid) }));
  const addView = (id) => patch(id, (p) => ({ ...p, views: p.views + 1 }));
  const delPost = async (id) => {
    if (!confirm('Удалить запись навсегда?')) return;
    await deleteImages(id).catch(() => {});
    setPosts((ps) => ps.filter((p) => p.id !== id));
    location.hash = '#/';
  };

  return (
    <>
      <Header
        page={route.page}
        theme={theme}
        onTheme={toggleTheme}
        author={author}
        onLogin={login}
        onLogout={logout}
        onNew={() => setEditing(true)}
        q={q}
        setQ={setQ}
      />
      <div className="page">
        {route.page === 'home' && <Home posts={posts} q={q} />}
        {route.page === 'about' && <About profile={profile} posts={posts} author={author} onEdit={() => setEditingProfile(true)} />}
        {route.page === 'post' && (
          <Post
            post={posts.find((p) => p.id === route.id)}
            profile={profile}
            author={author}
            liked={liked}
            onLike={toggleLike}
            onComment={addComment}
            onDeleteComment={delComment}
            onDeletePost={delPost}
            onView={addView}
          />
        )}
      </div>
      {editing && (
        <Editor
          onClose={() => setEditing(false)}
          onDone={(p) => {
            setPosts((ps) => [p, ...ps]);
            setEditing(false);
            location.hash = `#/post/${p.id}`;
          }}
        />
      )}
      {editingProfile && (
        <ProfileEditor
          profile={profile}
          onClose={() => setEditingProfile(false)}
          onSave={(p) => {
            setProfile(p);
            setEditingProfile(false);
          }}
        />
      )}
    </>
  );
}
