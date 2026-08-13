import { db } from './schema'

/**
 * Normalises a label to Title-Case (e.g. "laparoscopic hysterectomy" -> "Laparoscopic Hysterectomy")
 */
export function toTitleCase(str: string): string {
  if (!str) return ''
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((word) => {
      // Preserve acronyms like LSCS, NVD, TIFFA, MTP, USG, D&C, MVA, PPH, ECV, LAVH, TLH, OCPs, PPIUCD, IUD, HPV, VIA, IUI
      if (/^(lscs|nvd|tifff?a|mtp|usg|d&c|mva|pph|ecv|lavh|tlh|ocps|ppiucd|iud|hpv|via|iui|hpe|gdm|nt)$/i.test(word)) {
        return word.toUpperCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export const SEED_PROCEDURES = {
  Obstetric: [
    'LSCS',
    'NVD',
    'Instrumental delivery (Vacuum)',
    'Instrumental delivery (Forceps)',
    'Breech delivery',
    'PPH management',
    'Manual removal of placenta',
    'Cervical encerclage',
    'ECV',
    'Hysterotomy',
  ],
  'Gynaecological – Laparoscopic': [
    'Laparoscopic hysterectomy (TLH)',
    'Laparoscopic hysterectomy (LAVH)',
    'Laparoscopic myomectomy',
    'Laparoscopic ovarian cystectomy',
    'Laparoscopic salpingectomy',
    'Laparoscopic salpingo-oophorectomy',
    'Laparoscopic adhesiolysis',
    'Diagnostic laparoscopy',
    'Laparoscopic endometriosis excision',
    'Laparoscopic pelvic floor repair',
  ],
  'Gynaecological – Open / Vaginal': [
    'Abdominal hysterectomy',
    'Abdominal myomectomy',
    'Hysteroscopy (diagnostic)',
    'Hysteroscopy (operative)',
    'D&C',
    'MVA',
    'Colposcopy',
    'Vulvectomy',
    'Anterior colporrhaphy',
    'Posterior colporrhaphy',
    'Fothergill repair',
    'Vaginal hysterectomy',
  ],
}

/**
 * Merges seeded procedure list with case-insensitive unique entries from local DB `cases.procedure`.
 */
export async function getAutocompleteProcedures(query = ''): Promise<string[]> {
  const allSeedValues = Object.values(SEED_PROCEDURES).flat()
  const dbCases = await db.cases.toArray()

  // Case-insensitive deduplication using lowerCase key mapping
  const seenMap = new Map<string, string>()

  // 1. Add seeds first
  for (const seed of allSeedValues) {
    const key = seed.toLowerCase().trim()
    if (!seenMap.has(key)) {
      seenMap.set(key, seed)
    }
  }

  // 2. Add existing DB procedures
  for (const c of dbCases) {
    if (c.procedure && c.procedure.trim()) {
      const formatted = toTitleCase(c.procedure)
      const key = formatted.toLowerCase()
      if (!seenMap.has(key)) {
        seenMap.set(key, formatted)
      }
    }
  }

  const allDistinct = Array.from(seenMap.values())
  const q = query.trim().toLowerCase()
  if (!q) return allDistinct

  return allDistinct.filter((item) => item.toLowerCase().includes(q))
}
