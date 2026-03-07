// lib/sealed-api.ts
const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || '';
const SCRYDEX_BASE = 'https://api.scrydex.com/pokemon/v1';

export interface SealedProduct {
  id: string;
  name: string;
  type: string;
  images: {
    type: string;
    small: string;
    medium: string;
    large: string;
  }[];
  expansion: {
    id: string;
    name: string;
    series: string;
    language: string;
    language_code: string;
    release_date: string;
  };
  variants?: any[];
  language?: string;
  language_code?: string;
}

function isJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/.test(text);
}

/**
 * Searches for sealed products across the whole database or a specific set.
 * Supports Japanese and English sealed products.
 */
export async function searchSealedProducts(
  query: string,
  page: number = 1,
  limit: number = 50,
  setCode?: string,
  forceLang?: string
): Promise<{ data: SealedProduct[]; totalCount: number }> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) {
    console.error('Sealed API: Missing Credentials');
    return { data: [], totalCount: 0 };
  }

  try {
    const normalisedLang = forceLang && forceLang !== 'all' ? forceLang.toLowerCase() : 'all';
    
    // FIX: Detect Japanese set codes (e.g., SV4A, S12A)
    const isJapaneseSet = setCode && (
      setCode.toLowerCase().endsWith('a') || 
      setCode.toLowerCase().startsWith('s') ||
      ['jtg', 'cp'].includes(setCode.toLowerCase())
    );

    const wantsJapanese = normalisedLang === 'all' || normalisedLang.includes('ja') || isJapaneseSet || isJapanese(query);
    const wantsEnglish  = (normalisedLang === 'all' || normalisedLang.includes('en')) && !isJapaneseSet;

    const endpoints: Array<{ path: string; lang: string }> = [];
    if (wantsEnglish) endpoints.push({ path: '/en/sealed', lang: 'en' });
    if (wantsJapanese) endpoints.push({ path: '/ja/sealed', lang: 'ja' });

    const sealedMap = new Map<string, SealedProduct>();
    let apiTotal = 0;

    const searchPromises = endpoints.map(async (ep) => {
      try {
        const url = new URL(`${SCRYDEX_BASE}${ep.path}`);
        
        const filters: string[] = [];
        if (query) {
          // Build Lucene query with wildcard matching
          const terms = query.split(/\s+/).filter(Boolean);
          if (terms.length > 0) {
            // For sealed products, search in name field
            const termQuery = terms.map(t => {
              if (ep.lang === 'ja') {
                // For Japanese endpoint, support both Japanese and English searches
                return `(name:${t}* OR translation.en.name:${t}*)`;
              } else {
                // For English endpoint, search name
                return `name:${t}*`;
              }
            }).join(' AND ');
            filters.push(`(${termQuery})`);
          }
        }
        
        if (setCode) {
          filters.push(`expansion.id:${setCode.toLowerCase()}`);
        }

        if (filters.length > 0) {
          url.searchParams.append('q', filters.join(' AND '));
        }

        url.searchParams.append('page', page.toString());
        url.searchParams.append('pageSize', limit.toString());
        url.searchParams.append('include', 'prices');
        url.searchParams.append('casing', 'camel');

        const res = await fetch(url.toString(), {
          headers: {
            'X-Api-Key': SCRYDEX_API_KEY,
            'X-Team-ID': SCRYDEX_TEAM_ID,
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!res.ok) {
          const err = await res.text();
          console.error(`ScryDex Sealed API Error (${ep.lang}):`, err);
          return { products: [], total: 0 };
        }

        const json = await res.json();
        const products = (json?.data || []).map((product: any) => ({
          ...product,
          language: ep.lang,
          language_code: ep.lang.toUpperCase(),
        }));
        return { products, total: json?.totalCount || json?.total || 0 };
      } catch (error) {
        console.error(`Sealed search fetch error (${ep.lang}):`, error);
        return { products: [], total: 0 };
      }
    });

    const results = await Promise.all(searchPromises);
    for (const res of results) {
      for (const product of res.products) {
        const productKey = `${product.id}-${product.language}`;
        if (!sealedMap.has(productKey)) {
          sealedMap.set(productKey, product);
        }
      }
      apiTotal += res.total;
    }

    return {
      data: Array.from(sealedMap.values()),
      totalCount: sealedMap.size || apiTotal
    };
  } catch (error) {
    console.error('Sealed search error:', error);
    return { data: [], totalCount: 0 };
  }
}

/**
 * Fetches a single sealed product by its ID.
 */
export async function getSealedProductById(id: string, lang: string = 'en'): Promise<SealedProduct | null> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) return null;
  
  try {
    const langPath = lang.toLowerCase() === 'ja' ? '/ja' : '/en';
    const res = await fetch(`${SCRYDEX_BASE}${langPath}/sealed/${id}?include=prices&casing=camel`, {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
      }
    });
    
    if (!res.ok) return null;
    const json = await res.json();
    return {
      ...json.data,
      language: lang.toLowerCase(),
      language_code: lang.toUpperCase(),
    };
  } catch (e) {
    return null;
  }
}
