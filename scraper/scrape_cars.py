"""
AutoEvoFlow — Real Data Scraper
Source: caricos.com
Strategy:
  - 1 HTTP request per brand (brand listing page)
  - 0 extra requests for images (URL pattern is predictable)
  - Total: ~37 requests for 36 brands + index page
Output: frontend/public/data/*.json
"""

import requests, json, time, re, os, sys
from bs4 import BeautifulSoup
from collections import defaultdict
from urllib.parse import urlparse

sys.stdout.reconfigure(encoding='utf-8')

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept-Language': 'en-US,en;q=0.9',
}

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       '..', 'frontend', 'public', 'data')
os.makedirs(OUT_DIR, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update(HEADERS)

COUNTRY_CODES = {
    'Germany': 'DE', 'Italy': 'IT', 'Japan': 'JP', 'USA': 'US',
    'UK': 'GB', 'France': 'FR', 'Sweden': 'SE', 'South Korea': 'KR',
}

# slug → (caricos_filename, display_name, country, founded, parent, headquarters)
TARGET_BRANDS = {
    'bmw':          ('bmw',           'BMW',           'Germany', 1916, 'BMW Group',           'Munich, Germany'),
    'mercedes':     ('mercedes-benz', 'Mercedes-Benz', 'Germany', 1926, 'Mercedes-Benz Group', 'Stuttgart, Germany'),
    'audi':         ('audi',          'Audi',          'Germany', 1909, 'Volkswagen Group',    'Ingolstadt, Germany'),
    'porsche':      ('porsche',       'Porsche',        'Germany', 1931, 'Volkswagen Group',   'Stuttgart, Germany'),
    'volkswagen':   ('vw',            'Volkswagen',    'Germany', 1937, 'Volkswagen Group',    'Wolfsburg, Germany'),
    'ferrari':      ('ferrari',       'Ferrari',       'Italy',   1939, None,                  'Maranello, Italy'),
    'lamborghini':  ('lamborghini',   'Lamborghini',   'Italy',   1963, 'Volkswagen Group',    "Sant'Agata Bolognese, Italy"),
    'maserati':     ('maserati',      'Maserati',      'Italy',   1914, 'Stellantis',          'Modena, Italy'),
    'alfa_romeo':   ('alfa_romeo',    'Alfa Romeo',    'Italy',   1910, 'Stellantis',          'Milan, Italy'),
    'pagani':       ('pagani',        'Pagani',        'Italy',   1992, None,                  'San Cesario sul Panaro, Italy'),
    'toyota':       ('toyota',        'Toyota',        'Japan',   1937, None,                  'Toyota City, Japan'),
    'honda':        ('honda',         'Honda',         'Japan',   1948, None,                  'Tokyo, Japan'),
    'nissan':       ('nissan',        'Nissan',        'Japan',   1933, None,                  'Yokohama, Japan'),
    'mazda':        ('mazda',         'Mazda',         'Japan',   1920, None,                  'Hiroshima, Japan'),
    'subaru':       ('subaru',        'Subaru',        'Japan',   1953, 'Toyota',              'Tokyo, Japan'),
    'lexus':        ('lexus',         'Lexus',         'Japan',   1989, 'Toyota',              'Nagoya, Japan'),
    'infiniti':     ('infiniti',      'Infiniti',      'Japan',   1989, 'Nissan',              'Yokohama, Japan'),
    'ford':         ('ford',          'Ford',          'USA',     1903, None,                  'Dearborn, USA'),
    'chevrolet':    ('chevrolet',     'Chevrolet',     'USA',     1911, 'General Motors',      'Detroit, USA'),
    'dodge':        ('dodge',         'Dodge',         'USA',     1900, 'Stellantis',          'Auburn Hills, USA'),
    'cadillac':     ('cadillac',      'Cadillac',      'USA',     1902, 'General Motors',      'Detroit, USA'),
    'acura':        ('acura',         'Acura',         'USA',     1986, 'Honda',               'Torrance, USA'),
    'lincoln':      ('lincoln',       'Lincoln',       'USA',     1917, 'Ford',                'Dearborn, USA'),
    'tesla':        ('tesla',         'Tesla',         'USA',     2003, None,                  'Austin, USA'),
    'rivian':       ('rivian',        'Rivian',        'USA',     2009, None,                  'Irvine, USA'),
    'bentley':      ('bentley',       'Bentley',       'UK',      1919, 'Volkswagen Group',    'Crewe, UK'),
    'rolls_royce':  ('rolls-royce',   'Rolls-Royce',   'UK',      1906, 'BMW Group',           'Goodwood, UK'),
    'mclaren':      ('mclaren',       'McLaren',       'UK',      1963, None,                  'Woking, UK'),
    'aston_martin': ('aston_martin',  'Aston Martin',  'UK',      1913, None,                  'Gaydon, UK'),
    'jaguar':       ('jaguar',        'Jaguar',        'UK',      1922, 'Tata Motors',         'Coventry, UK'),
    'land_rover':   ('land_rover',    'Land Rover',    'UK',      1948, 'Tata Motors',         'Gaydon, UK'),
    'volvo':        ('volvo',         'Volvo',         'Sweden',  1927, 'Geely',               'Gothenburg, Sweden'),
    'koenigsegg':   ('koenigsegg',    'Koenigsegg',    'Sweden',  1994, None,                  'Angelholm, Sweden'),
    'bugatti':      ('bugatti',       'Bugatti',       'France',  1909, 'Porsche AG',          'Molsheim, France'),
    'renault':      ('renault',       'Renault',       'France',  1899, None,                  'Boulogne-Billancourt, France'),
    'peugeot':      ('peugeot',       'Peugeot',       'France',  1882, 'Stellantis',          'Paris, France'),
}

# Ordered keyword → body-type (first match wins)
BODY_TYPE_RULES = [
    ('pickup',      'pickup'), ('truck',       'pickup'),
    ('convertible', 'convertible'), ('cabriolet', 'convertible'),
    ('spyder',      'convertible'), ('roadster',  'convertible'),
    ('spider',      'convertible'),
    ('wagon',       'wagon'),  ('estate',      'wagon'),
    ('van',         'van'),    ('minivan',     'van'),
    ('hatchback',   'hatchback'),
    ('coupe',       'coupe'),  ('fastback',    'coupe'), ('targa', 'coupe'),
    ('concept',     'concept'),('vision',      'concept'),
    ('suv',         'suv'),    ('crossover',   'crossover'),
    ('sedan',       'sedan'),  ('limousine',   'sedan'),
]

SUV_FRAGMENTS = {
    'x1','x2','x3','x4','x5','x6','x7',
    'q3','q5','q7','q8','sq5','sq7','sq8','rsq8',
    'gla','glb','glc','gle','gls','ml','gl',
    'rav4','cr-v','crv','cx-5','cx5','cx-30','cx-9',
    'forester','outback','ascent',
    'pilot','passport','ridgeline',
    'highlander','4runner','land cruiser','rav',
    'cayenne','macan','urus',
    'defender','discovery','range rover','evoque','velar','sport',
    'tiguan','touareg','t-roc','taos',
    'qashqai','murano','pathfinder','armada','rogue',
    'escalade','navigator','expedition','explorer','bronco',
    'terrain','equinox','traverse','tahoe','suburban','yukon',
    'encore','envoy','acadia',
    'mdx','rdx',
    'fx','qx',
    'rx','nx','gx','lx','ux',
}


def detect_body_type(name: str) -> str:
    n = name.lower()
    for fragment in SUV_FRAGMENTS:
        # word-boundary-like check
        if re.search(r'(?<![a-z])' + re.escape(fragment) + r'(?![a-z0-9])', n):
            return 'suv'
    for keyword, btype in BODY_TYPE_RULES:
        if keyword in n:
            return btype
    return 'sedan'


def slug_from(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def parse_year(text: str) -> int | None:
    m = re.search(r'\b(19[5-9]\d|20[0-2]\d)\b', text)
    return int(m.group(1)) if m else None


def derive_image_url(model_page_url: str) -> str:
    """
    Derive the primary caricos image URL from the model page URL.
    caricos.com/cars/b/bmw/2025_bmw_m3/
    → images.caricos.com/b/bmw/2025_bmw_m3/images/1920x1080/2025_bmw_m3_1_1920x1080.jpg
    """
    # Strip trailing slash, split path
    path = urlparse(model_page_url).path.rstrip('/')
    parts = path.split('/')          # ['', 'cars', 'b', 'bmw', '2025_bmw_m3']
    if len(parts) < 5:
        return ''
    letter   = parts[2]             # 'b'
    brand    = parts[3]             # 'bmw'
    slug     = parts[4]             # '2025_bmw_m3'
    return (
        f'https://images.caricos.com/{letter}/{brand}/{slug}'
        f'/images/1920x1080/{slug}_1_1920x1080.jpg'
    )


# ─── HTTP ─────────────────────────────────────────────────────────────────────

def get_soup(url: str, delay: float = 0.35) -> BeautifulSoup | None:
    try:
        r = SESSION.get(url, timeout=15)
        time.sleep(delay)
        if r.status_code == 200:
            return BeautifulSoup(r.text, 'lxml')
        print(f'  [SKIP] {r.status_code} {url}')
        return None
    except Exception as e:
        print(f'  [ERR] {url}: {e}')
        return None


# ─── Scraping ─────────────────────────────────────────────────────────────────

def scrape_brand_entries(caricos_filename: str) -> list[dict]:
    """
    Fetch the brand listing page and return:
      [{name, url, year, image_url}, ...]
    Only 1 HTTP request per brand.
    """
    url  = f'https://www.caricos.com/cars/{caricos_filename}.html'
    soup = get_soup(url)
    if not soup:
        return []

    entries, seen = [], set()
    for a in soup.find_all('a', href=True):
        href = a['href']
        text = a.get_text(strip=True)
        if (
            'caricos.com/cars/' in href
            and f'/{caricos_filename}/' in href
            and text
            and href not in seen
        ):
            seen.add(href)
            year      = parse_year(text) or parse_year(href)
            image_url = derive_image_url(href)
            entries.append({'name': text, 'url': href,
                            'year': year, 'image_url': image_url})

    return entries


# ─── Data builders ────────────────────────────────────────────────────────────

def clean_name(raw: str, display_name: str) -> str:
    n = re.sub(r'\s*\|\s*\d{4}MY\s*$', '', raw)
    n = re.sub(r'^\d{4}\s+', '', n)
    n = re.sub(r'\s*(US|EU|JP|UK|AU|DE|US-Spec|EU-Spec|JP-Spec|UK-Spec).*', '', n, flags=re.I)
    n = re.sub(rf'^{re.escape(display_name)}\s+', '', n, flags=re.I)
    return n.strip() or raw.strip()


def build_models_and_generations(
    entries: list[dict],
    brand_slug: str,
    brand_id: str,
    display_name: str,
) -> tuple[list[dict], list[dict]]:
    NOW = '2026-01-01T00:00:00Z'

    # Group entries by cleaned model name
    groups: dict[str, list[dict]] = defaultdict(list)
    for e in entries:
        key = clean_name(e['name'], display_name)
        groups[key].append(e)

    models, generations = [], []

    for model_name, group in groups.items():
        years      = sorted(e['year'] for e in group if e.get('year'))
        start_year = years[0]  if years else 2020
        end_year   = years[-1] if years else None
        is_active  = (not end_year) or end_year >= 2023
        body_type  = detect_body_type(model_name)
        model_id   = f'm-{brand_slug}-{slug_from(model_name)}'
        model_slug = f'{brand_slug}-{slug_from(model_name)}'

        # Best thumbnail: most recent entry that has an image URL
        recent    = sorted(group, key=lambda e: e.get('year') or 0, reverse=True)
        thumbnail = next((e['image_url'] for e in recent if e.get('image_url')), '')

        model = {
            'id':                  model_id,
            'slug':                model_slug,
            'name':                model_name,
            'fullName':            f'{display_name} {model_name}',
            'brandId':             brand_id,
            'bodyType':            body_type,
            'segment':             'midsize',
            'primaryMarket':       'global',
            'startYear':           start_year,
            'endYear':             (end_year if not is_active else None),
            'isActive':            is_active,
            'description':         (
                f'{display_name} {model_name} — {body_type}, '
                f'produced since {start_year}.'
            ),
            'generationCount':     len(group),
            'thumbnailUrl':        thumbnail,
            'heroImageUrl':        thumbnail,
            'tags':                [body_type, brand_slug.replace('_', '-')],
            'aiAnalysisAvailable': False,
            'createdAt':           NOW,
            'updatedAt':           NOW,
        }
        models.append(model)

        # One generation record per year entry (cap 12 most recent)
        for i, entry in enumerate(recent[:12]):
            gen_year = entry.get('year') or start_year
            img      = entry.get('image_url', '')
            uid      = f'{brand_slug}-{slug_from(model_name)}-{gen_year}-{i}'
            gen = {
                'id':                  f'gen-{uid}',
                'slug':                uid,
                'modelId':             model_id,
                'brandId':             brand_id,
                'codeName':            str(gen_year),
                'generationNumber':    i + 1,
                'startYear':           gen_year,
                'endYear':             None,
                'isFacelift':          False,
                'isConcept':           'concept' in entry['name'].lower(),
                'bodyTypes':           [body_type],
                'engineTypes':         ['ICE'],
                'markets':             ['global'],
                'description':         entry['name'],
                'thumbnailUrl':        img,
                'heroImageUrl':        img,
                'images': [{
                    'id':           f'img-{uid}',
                    'generationId': f'gen-{uid}',
                    'url':          img,
                    'thumbnailUrl': img,
                    'angle':        'front_34',
                    'isPrimary':    True,
                    'year':         gen_year,
                    'altText':      entry['name'],
                    'width':        1920,
                    'height':       1080,
                    'source':       'caricos.com',
                }] if img else [],
                'tags':                [body_type, str(gen_year)],
                'aiAnalysisAvailable': False,
                'createdAt':           NOW,
                'updatedAt':           NOW,
            }
            generations.append(gen)

    return models, generations


def build_brand_record(
    brand_slug: str, info: tuple, model_count: int, gen_count: int
) -> dict:
    caricos_name, display_name, country, founded, parent, hq = info
    NOW = '2026-01-01T00:00:00Z'
    return {
        'id':                  f'brand-{brand_slug}',
        'slug':                brand_slug,
        'name':                display_name,
        'fullName':            parent or display_name,
        'country':             country,
        'countryCode':         COUNTRY_CODES.get(country, 'XX'),
        'foundingYear':        founded,
        'logoUrl':             '',
        'logoWhiteUrl':        '',
        'headerImageUrl':      '',
        'description':         (
            f'{display_name} is a {country} automobile manufacturer '
            f'founded in {founded}.'
        ),
        'parentCompany':       parent,
        'headquarters':        hq,
        'modelCount':          model_count,
        'generationCount':     gen_count,
        'tags':                [country.lower(), 'automotive'],
        'aiAnalysisAvailable': False,
        'createdAt':           NOW,
        'updatedAt':           NOW,
    }


def save(path: str, data: object) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    kb = os.path.getsize(path) // 1024
    print(f'    → {os.path.basename(path)} ({kb} KB)', flush=True)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    brand_dir = os.path.join(OUT_DIR, 'brands')
    model_dir = os.path.join(OUT_DIR, 'models')
    os.makedirs(brand_dir, exist_ok=True)
    os.makedirs(model_dir, exist_ok=True)

    all_brands, all_models, all_generations = [], [], []
    total = len(TARGET_BRANDS)

    for idx, (brand_slug, info) in enumerate(TARGET_BRANDS.items(), 1):
        caricos_name, display_name, *_ = info
        print(f'[{idx:02d}/{total}] {display_name} ...', flush=True)

        entries = scrape_brand_entries(caricos_name)
        if not entries:
            brand_rec = build_brand_record(brand_slug, info, 0, 0)
            all_brands.append(brand_rec)
            save(os.path.join(brand_dir, f'{brand_slug}.json'),
                 {**brand_rec, 'models': []})
            continue

        models, generations = build_models_and_generations(
            entries, brand_slug, f'brand-{brand_slug}', display_name
        )
        brand_rec = build_brand_record(brand_slug, info, len(models), len(generations))

        all_brands.append(brand_rec)
        all_models.extend(models)
        all_generations.extend(generations)

        print(f'       {len(entries)} entries → '
              f'{len(models)} models, {len(generations)} generations', flush=True)

        save(os.path.join(brand_dir, f'{brand_slug}.json'),
             {**brand_rec, 'models': models})

    # Per-model files
    gens_by_model: dict[str, list] = defaultdict(list)
    for g in all_generations:
        gens_by_model[g['modelId']].append(g)

    print(f'\nWriting {len(all_models)} model files…', flush=True)
    for m in all_models:
        save(os.path.join(model_dir, f'{m["slug"]}.json'),
             {**m, 'generations': gens_by_model[m['id']]})

    save(os.path.join(OUT_DIR, 'brands.json'), all_brands)
    save(os.path.join(OUT_DIR, 'models.json'), all_models)

    print(f'\n{"═"*50}')
    print(f'Brands:      {len(all_brands)}')
    print(f'Models:      {len(all_models)}')
    print(f'Generations: {len(all_generations)}')
    print(f'Output dir:  {os.path.abspath(OUT_DIR)}')


if __name__ == '__main__':
    main()
