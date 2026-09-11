const MOVIE_SHOW_FALLBACK = [
  "Avatar",
  "Avengers",
  "Back to the Future",
  "Batman",
  "Black Panther",
  "Braveheart",
  "Casablanca",
  "Cast Away",
  "Coco",
  "Die Hard",
  "Dune",
  "E.T.",
  "Encanto",
  "Finding Nemo",
  "Forrest Gump",
  "Frozen",
  "Ghostbusters",
  "Gladiator",
  "Gone with the Wind",
  "Goodfellas",
  "Gravity",
  "Grease",
  "Harry Potter",
  "Home Alone",
  "Inception",
  "Indiana Jones",
  "Inside Out",
  "Interstellar",
  "Iron Man",
  "Jaws",
  "Jurassic Park",
  "King Kong",
  "La La Land",
  "Lord of the Rings",
  "Mad Max",
  "Mary Poppins",
  "Mean Girls",
  "Moana",
  "Monsters Inc",
  "Mrs. Doubtfire",
  "Ocean's Eleven",
  "Paddington",
  "Pirates of the Caribbean",
  "Pretty Woman",
  "Psycho",
  "Pulp Fiction",
  "Ratatouille",
  "Rocky",
  "Saving Private Ryan",
  "Shrek",
  "Singin' in the Rain",
  "Spider-Man",
  "Star Trek",
  "Star Wars",
  "Superman",
  "The Dark Knight",
  "The Godfather",
  "The Hunger Games",
  "The Lion King",
  "The Little Mermaid",
  "The Matrix",
  "The Notebook",
  "The Princess Bride",
  "The Sound of Music",
  "The Wizard of Oz",
  "Titanic",
  "Top Gun",
  "Toy Story",
  "Twilight",
  "Up",
  "Wall-E",
  "West Side Story",
  "Wicked",
  "Wonder Woman",
  "Breaking Bad",
  "Bridgerton",
  "Cobra Kai",
  "Friends",
  "Game of Thrones",
  "Grey's Anatomy",
  "House of the Dragon",
  "How I Met Your Mother",
  "Lost",
  "Only Murders",
  "Parks and Recreation",
  "Seinfeld",
  "Sherlock",
  "SpongeBob",
  "Stranger Things",
  "Succession",
  "Ted Lasso",
  "The Bear",
  "The Crown",
  "The Mandalorian",
  "The Office",
  "The Simpsons",
  "The Walking Dead",
  "The White Lotus",
  "The Witcher",
  "Wednesday",
  "Yellowstone",
];

const REFRESH_MS = 12 * 60 * 60 * 1000;
const FETCH_MS = 8000;

let cached = [...MOVIE_SHOW_FALLBACK];
let timer: ReturnType<typeof setInterval> | null = null;

export function getMovieShowWords(): string[] {
  return cached;
}

export function startMovieShowRefresh() {
  void refreshMovieShowWords();
  if (timer) return;
  timer = setInterval(() => {
    void refreshMovieShowWords();
  }, REFRESH_MS);
  timer.unref?.();
}

export async function refreshMovieShowWords() {
  try {
    const [movies, seasons, shows] = await Promise.all([
      fetchItunesTitles("topmovies"),
      fetchItunesTitles("toptvseasons"),
      fetchTvmazeTitles(),
    ]);
    const merged = uniqueWords([
      MOVIE_SHOW_FALLBACK,
      movies,
      seasons,
      shows,
    ]);
    if (merged.length >= MOVIE_SHOW_FALLBACK.length) {
      cached = merged;
      console.log(`Movie/show words: ${cached.length} titles (iTunes + TVmaze)`);
    }
  } catch (err) {
    console.warn(
      "Movie/show refresh failed, using static list",
      err instanceof Error ? err.message : err,
    );
  }
}

function uniqueWords(lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const word of list) {
      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(word);
    }
  }
  return out;
}

function cleanTitle(raw: string): string | null {
  let title = raw
    .replace(/\s*\(\d{4}\)\s*/g, " ")
    .replace(/\s*[:\-–].*(edition|version|extended|uncut|season\s+\d+).*$/i, "")
    .replace(/\s+season\s+\d+.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (title.length < 2 || title.length > 32) return null;
  if (!/[\p{L}]/u.test(title)) return null;
  return title;
}

type ItunesFeed = {
  feed?: { entry?: ItunesEntry | ItunesEntry[] };
};
type ItunesEntry = { "im:name"?: { label?: string } };

async function fetchItunesTitles(chart: "topmovies" | "toptvseasons"): Promise<string[]> {
  const data = await fetchJson<ItunesFeed>(
    `https://itunes.apple.com/us/rss/${chart}/limit=100/json`,
  );
  const entry = data?.feed?.entry;
  const rows = Array.isArray(entry) ? entry : entry ? [entry] : [];
  return rows
    .map((row) => cleanTitle(String(row["im:name"]?.label || "")))
    .filter((title): title is string => Boolean(title));
}

type TvShow = {
  name?: string;
  language?: string;
  weight?: number;
  type?: string;
  rating?: { average?: number | null };
};

async function fetchTvmazeTitles(): Promise<string[]> {
  const pages = await Promise.all([0, 1, 2].map((page) =>
    fetchJson<TvShow[]>(`https://api.tvmaze.com/shows?page=${page}`),
  ));
  return pages
    .flat()
    .filter((show) => {
      if (show.language !== "English") return false;
      if (show.type && show.type !== "Scripted" && show.type !== "Animation") return false;
      const rating = show.rating?.average ?? 0;
      const weight = show.weight ?? 0;
      return weight >= 90 || rating >= 7.4;
    })
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .map((show) => cleanTitle(String(show.name || "")))
    .filter((title): title is string => Boolean(title))
    .slice(0, 250);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Sketchinary/1.0 (pictionary word list)" },
    signal: AbortSignal.timeout(FETCH_MS),
  });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return (await response.json()) as T;
}
