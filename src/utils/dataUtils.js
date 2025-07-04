// src/utils/dataUtils.js
// -----------------------------------------------------------------------------
//  Utilità per il caricamento e il parsing di tutti i CSV usati nell'app
// -----------------------------------------------------------------------------

// Helper per scalare un valore da un range a un altro (es. z-score a 0-100)
export const scaleTo100 = (value, sourceRange = [-2.0, 2.0]) => {
  if (value === null || isNaN(value)) return null;
  const [min, max] = sourceRange;
  // Fissa il valore entro il range sorgente
  const clampedValue = Math.max(min, Math.min(max, value));
  // Normalizza in un range 0-1
  const normalized = (clampedValue - min) / (max - min);
  // Scala a 0-100 e arrotonda
  return Math.round(normalized * 100);
};

// Helper di normalizzazione (MODIFICATO: Aggiunto export per usarlo in MapChart)
export const normalizeRegionName = (name) => name?.trim().toUpperCase().replace(/-/g, ' ').replace(/\s+/g, ' ');

// 1. Parser del dataset principale (prezzi e transazioni per regione + Italia)
const parseHousingCycleData = (csvString) => {
  if (!csvString) return {};
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return {};
  const headers = lines[0].split(',').map((h) => h.trim());
  const data = {};
  const yearIndex = headers.indexOf('Anno'), regionIndex = headers.indexOf('Regione'), transactionsIndex = headers.indexOf('Numero_Transazioni'), avgPriceIndex = headers.indexOf('Prezzo_Medio'), priceVarIndex = headers.indexOf('Variazione_%_Prezzo');
  if ([yearIndex, regionIndex, transactionsIndex, avgPriceIndex, priceVarIndex].includes(-1)) { console.error('CSV headers non trovati o errati nel dataset principale.'); return {}; }
  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;
    const region = normalizeRegionName(values[regionIndex]);
    const year = values[yearIndex]?.trim();
    if (!region || !year) continue;
    if (!data[region]) data[region] = [];
    const numTransactionsRaw = parseFloat(values[transactionsIndex]?.replace(/\s/g, '').replace(',', '.'));
    const avgPriceRaw = parseFloat(values[avgPriceIndex]?.replace(/\s/g, '').replace(',', '.'));
    const priceVarStr = values[priceVarIndex]?.trim().replace(',', '.');
    data[region].push({
      year,
      regionName: region, // Aggiunto per coerenza
      transactions: !Number.isNaN(numTransactionsRaw) ? numTransactionsRaw / 1_000 : null,
      originalTransactions: !Number.isNaN(numTransactionsRaw) ? numTransactionsRaw : null,
      averagePrice: !Number.isNaN(avgPriceRaw) ? avgPriceRaw : null,
      priceVar: priceVarStr && !Number.isNaN(parseFloat(priceVarStr)) ? parseFloat(priceVarStr) : null,
    });
  }
  return data;
};

// 2. Parser delle transazioni suddivise per classi di metratura
const parseTransactionsByMqData = (csvString) => {
  if (!csvString) return {};
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return {};
  const headers = lines[0].split(',').map((h) => h.trim());
  const data = {};
  const regionIdx = headers.indexOf('Regione'), yearIdx = headers.indexOf('anno');
  const mqCols = ['NTN_fino_a_50_mq', 'NTN_50_85_mq', 'NTN_85_115_mq', 'NTN_115_145_mq', 'NTN_oltre_145_mq'];
  const mqIdxs = mqCols.map((c) => headers.indexOf(c));
  if (regionIdx === -1 || yearIdx === -1 || mqIdxs.includes(-1)) { console.error('Headers mancanti nel CSV "transazioni per mq".'); return {}; }
  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;
    const region = normalizeRegionName(values[regionIdx]), year = values[yearIdx]?.trim();
    if (!region || !year) continue;
    if (!data[region]) data[region] = {};
    data[region][year] = {
      fino_a_50: parseFloat(values[mqIdxs[0]]) || 0, _50_85: parseFloat(values[mqIdxs[1]]) || 0, _85_115: parseFloat(values[mqIdxs[2]]) || 0, _115_145: parseFloat(values[mqIdxs[3]]) || 0, oltre_145: parseFloat(values[mqIdxs[4]]) || 0,
    };
  }
  return data;
};

// 3. Parser del modello "leading" con impatti variabili
const parsePredictiveModelWithImpactsData = (csvString) => {
  if (!csvString) return {};
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return {};
  const headers = lines[0].split(',').map((h) => h.trim());
  const data = {};
  const idx = { reg: headers.indexOf('Regione'), y: headers.indexOf('Anno'), yAct: headers.indexOf('Y_Indice_Mercato'), yPred: headers.indexOf('Y_Predetto_dal_Modello'), conf: headers.indexOf('Impatto_Fiducia_durevoli_t-1'), spr: headers.indexOf('Impatto_Spread_t-1'), mut: headers.indexOf('Impatto_Nuove_iscrizioni_mutui_RES_t-1'), res: headers.indexOf('Impatto_Residenziale_abitazioni_Variazione_annuale_t-1'), int: headers.indexOf('Impatto_Intercetta'), };
  if (Object.values(idx).includes(-1)) { console.error('Headers mancanti o errati nel CSV "risultati modello leading".'); return {}; }
  for (let i = 1; i < lines.length; i += 1) {
    const vals = lines[i].split(',');
    if (vals.length < headers.length) continue;
    const region = normalizeRegionName(vals[idx.reg]), year = vals[idx.y]?.trim();
    if (!region || !year) continue;
    if (!data[region]) data[region] = {};
    data[region][year] = {
      marketIndexActual: parseFloat(vals[idx.yAct]?.replace(',', '.')) || null, marketIndexPredicted: parseFloat(vals[idx.yPred]?.replace(',', '.')) || null,
      impacts: { confidence: parseFloat(vals[idx.conf]?.replace(',', '.')) || null, spread: parseFloat(vals[idx.spr]?.replace(',', '.')) || null, mortgages: parseFloat(vals[idx.mut]?.replace(',', '.')) || null, residentialVar: parseFloat(vals[idx.res]?.replace(',', '.')) || null, intercept: parseFloat(vals[idx.int]?.replace(',', '.')) || null, },
    };
  }
  return data;
};

// 4. Parser del modello "lagging" (ritardato)
const parseLaggingModelResults = (csvString) => {
  if (!csvString) return [];
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const idx = { year: headers.indexOf('Anno'), yAct: headers.indexOf('Y_Indice_Mercato'), yLag: headers.indexOf('Y_Indice_Mercato_t-1'), yPred: headers.indexOf('Y_Predetto_dal_Modello'), rent: headers.indexOf('Affitto_medio_€/m²'), costIdx: headers.indexOf('Indice_costi_costruzione'), defRate: headers.indexOf('Tasso_default_mutui'), impCost: headers.indexOf('Impatto_Indice_costi_costruzione'), impDef: headers.indexOf('Impatto_Tasso_default_mutui'), impRent: headers.indexOf('Impatto_Affitto_medio_€/m²'), impInt: headers.indexOf('Impatto_Intercetta'), };
  if (Object.values(idx).includes(-1)) { console.error('Headers mancanti nel CSV "modello lagging".'); return []; }
  const toNum = (v) => { if (typeof v !== 'string') return null; const n = parseFloat(v.replace(',', '.')); return Number.isNaN(n) ? null : n; };
  const results = [];
  for (let i = 1; i < lines.length; i += 1) {
    const v = lines[i].split(',');
    if (v.length < headers.length) continue;
    const year = parseInt(v[idx.year], 10);
    if (Number.isNaN(year)) continue;
    results.push({ year, marketIndexActual: toNum(v[idx.yAct]), marketIndexLagged: toNum(v[idx.yLag]), marketIndexPredicted: toNum(v[idx.yPred]), predictors: { avgRent: toNum(v[idx.rent]), constructionCostIndex: toNum(v[idx.costIdx]), mortgageDefaultRate: toNum(v[idx.defRate]), }, impacts: { constructionCost: toNum(v[idx.impCost]), defaultRate: toNum(v[idx.impDef]), rent: toNum(v[idx.impRent]), intercept: toNum(v[idx.impInt]), }, });
  }
  return results.sort((a, b) => a.year - b.year);
};

// 5. Parser della sostenibilità mutuo 90 m²
const parseAffordabilityMutuo90mqData = (csvString) => {
  if (!csvString) return [];
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const yearIdx = headers.indexOf('Anno'), priceIdx = headers.indexOf('Prezzo medio Italia'), incomeIdx = headers.indexOf('Reddito annuo medio (indice)'), sust20Idx = headers.findIndex((h) => h.startsWith('Sostenibilita') && h.includes('20')), sust25Idx = headers.findIndex((h) => h.startsWith('Sostenibilita') && h.includes('25'));
  if ([yearIdx, priceIdx, incomeIdx, sust20Idx, sust25Idx].includes(-1)) { console.error('Headers mancanti nel CSV "affordability_mutuo_90mq".'); return []; }
  return lines.slice(1).map((line) => {
    const v = line.split(',');
    if (v.length < headers.length) return null;
    return { year: v[yearIdx]?.trim(), averagePriceItaly: parseFloat(v[priceIdx]?.replace(',', '.')) || null, incomeIndex: parseFloat(v[incomeIdx]?.replace(',', '.')) || null, sustainability20: parseFloat(v[sust20Idx]?.replace(',', '.')) || null, sustainability25: parseFloat(v[sust25Idx]?.replace(',', '.')) || null, };
  }).filter(Boolean);
};

// 6. Parser per l'indice di salute del mercato
const parseHealthIndexData = (csvString) => {
  if (!csvString) return {};
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return {};
  const headers = lines[0].split(',').map((h) => h.trim());
  const data = {};

  const colIdx = {
    period: headers.indexOf('Periodo_Semestre'),
    region: headers.indexOf('Regione'),
    healthIndex: headers.indexOf('IMM'),
    fasciaSalute: headers.indexOf('Fascia_Salute'),
    affordability: headers.indexOf('Z_Accessibilita'),
    demandPressure: headers.indexOf('Z_PressioneDomanda'),
    liquidity: headers.indexOf('Z_Liquidita'),
    momentum: headers.indexOf('Z_PriceMomentum')
  };
  
  if (colIdx.period === -1 || colIdx.region === -1 || colIdx.healthIndex === -1) {
    console.error("Header essenziali mancanti nel CSV dell'indice di salute.", colIdx);
    return {};
  }
  
  const toNum = (v) => {
    if (typeof v !== 'string' || v.trim() === '') return null;
    const n = parseFloat(v.replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  };

  const rawData = lines.slice(1).map(line => {
    const values = line.split(',');
    if (values.length < headers.length) return null;
    return {
      regionName: normalizeRegionName(values[colIdx.region]),
      period: values[colIdx.period]?.trim(),
      rawHealthIndex: toNum(values[colIdx.healthIndex]),
      fasciaSalute: values[colIdx.fasciaSalute]?.trim() || 'N/D',
      kpis: {
        affordability: toNum(values[colIdx.affordability]),
        demandPressure: toNum(values[colIdx.demandPressure]),
        liquidity: toNum(values[colIdx.liquidity]),
        momentum: toNum(values[colIdx.momentum]),
      }
    };
  }).filter(Boolean);
  
  const allHealthScores = rawData.map(d => d.rawHealthIndex).filter(v => v !== null);
  const healthRange = [Math.min(...allHealthScores), Math.max(...allHealthScores)];

  const kpiRanges = {
    affordability: [Math.min(...rawData.map(d => d.kpis.affordability).filter(v=>v!==null)), Math.max(...rawData.map(d => d.kpis.affordability).filter(v=>v!==null))],
    demandPressure: [Math.min(...rawData.map(d => d.kpis.demandPressure).filter(v=>v!==null)), Math.max(...rawData.map(d => d.kpis.demandPressure).filter(v=>v!==null))],
    liquidity: [Math.min(...rawData.map(d => d.kpis.liquidity).filter(v=>v!==null)), Math.max(...rawData.map(d => d.kpis.liquidity).filter(v=>v!==null))],
    momentum: [Math.min(...rawData.map(d => d.kpis.momentum).filter(v=>v!==null)), Math.max(...rawData.map(d => d.kpis.momentum).filter(v=>v!==null))],
  };

  rawData.forEach(d => {
    const { regionName, period, rawHealthIndex, fasciaSalute, kpis } = d;
    if (!regionName || !period) return;
    
    const [year, semester] = period.split('_S');

    if (!data[regionName]) {
      data[regionName] = [];
    }
    
    // Variazione calcolata sul raw index per stabilità
    let variation = 0;
    const prevEntry = data[regionName][data[regionName].length - 1];
    if (prevEntry && prevEntry.rawHealthIndex !== null && rawHealthIndex !== null) {
      variation = rawHealthIndex - prevEntry.rawHealthIndex;
    }

    data[regionName].push({
      year,
      semester: `S${semester}`,
      period,
      regionName,
      healthIndex: rawHealthIndex, // Passiamo il valore raw, la scala verrà applicata nel componente
      variation, // Passiamo la variazione raw
      fasciaSalute,
      kpis: {
        affordability: scaleTo100(kpis.affordability, kpiRanges.affordability),
        demandPressure: scaleTo100(kpis.demandPressure, kpiRanges.demandPressure),
        liquidity: scaleTo100(kpis.liquidity, kpiRanges.liquidity),
        momentum: scaleTo100(kpis.momentum, kpiRanges.momentum),
      }
    });
  });
  
  for (const region in data) {
    data[region].sort((a, b) => {
      if (a.year !== b.year) return parseInt(a.year, 10) - parseInt(b.year, 10);
      return a.semester.localeCompare(b.semester);
    });
  }

  return data;
};


// 7. Parser Generico
const parseGenericCsv = (csvString) => {
  if (!csvString) return [];
  const rows = csvString.trim().split('\n');
  if (rows.length < 2) return [];
  const headers = rows[0].split(',').map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const vals = r.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      const raw = (vals[i] ?? '').trim();
      if (h === 'Date') {
        if (raw.includes('/')) {
          const parts = raw.split('/');
          if (parts.length === 3) {
            const year = parts[2]; const month = parts[1].padStart(2, '0'); const day = parts[0].padStart(2, '0');
            obj[h] = `${year}-${month}-${day}`;
          } else { obj[h] = raw; }
        } else { obj[h] = raw; }
      } else {
        const num = raw.replace(',', '.');
        obj[h] = raw !== '' && !Number.isNaN(num) && num !== '' && !Number.isNaN(parseFloat(num)) ? parseFloat(num) : raw;
      }
    });
    return obj;
  });
};

// LOADER #1: Per il ciclo immobiliare
export const loadAndParseHousingCycleData = async () => {
  const paths = {
    main:          '/Dati_Grafici/dataset_transazioni_prezzi_per_regione_e_italia.csv',
    mq:            '/Dati_Grafici/transazioni_per_regione_2011_2024_unico.csv',
    leading:       '/Dati_Grafici/risultati_modello_leading_zscore_shift.csv',
    lagging:       '/Dati_Grafici/risultati_modello_lagging.csv',
    affordability: '/Dati_Grafici/affordability_mutuo_90mq.csv',
    healthIndex:   '/Dati_Grafici/risultati_indice_salute_mercato_immobiliare.csv',
  };
  try {
    const [mainCsv, mqCsv, leadingCsv, laggingCsv, affordabilityCsv, healthIndexCsv] = await Promise.all(
      Object.values(paths).map(async (p) => {
        const resp = await fetch(p);
        if (!resp.ok) throw new Error(`Errore caricamento ${p}: ${resp.statusText}`);
        return resp.text();
      }),
    );
    const mainData = parseHousingCycleData(mainCsv);
    const mqData = parseTransactionsByMqData(mqCsv);
    const leadingData = parsePredictiveModelWithImpactsData(leadingCsv);
    const laggingData = parseLaggingModelResults(laggingCsv);
    const affordability = parseAffordabilityMutuo90mqData(affordabilityCsv);
    const healthIndexData = parseHealthIndexData(healthIndexCsv);

    for (const reg in mainData) {
      mainData[reg].forEach((row) => {
        if (mqData[reg]?.[row.year]) row.transactionsByMq = mqData[reg][row.year];
        if (leadingData[reg]?.[row.year]) row.predictive = leadingData[reg][row.year];
      });
      mainData[reg].sort((a, b) => parseInt(a.year, 10) - parseInt(b.year, 10));
    }
    return { regionalData: mainData, laggingModelData: laggingData, affordabilityMutuo90mq: affordability, healthIndexData };
  } catch (err) {
    console.error('Errore nel caricamento/fusione dei dati ciclo immobiliare:', err);
    return { regionalData: {}, laggingModelData: [], affordabilityMutuo90mq: [], healthIndexData: {} };
  }
};

// LOADER #2: Loader "tutto in uno" per la pagina di dettaglio
export const loadAllDataForDetailPage = async () => {
  const macroPaths = {
    cpi: '/Dati_Grafici/Macro_data/CPI_Monthly_Dataset.csv',
    punPsv: '/Dati_Grafici/Macro_data/Dataset_PUN___PSV.csv',
    gdpGrowth: '/Dati_Grafici/Macro_data/GDP_Growth_Rates_2013_2025.csv',
    bondYield10Y: '/Dati_Grafici/Macro_data/Rendimenti_Titoli_di_Stato_10Y__dal_2019_.csv',
    interbankRates: '/Dati_Grafici/Macro_data/Tassi_Interbancari_USA_ed_Europa__Mensile_.csv',
    commoditiesIndex: '/Dati_Grafici/Macro_data/Commodities_Index_dal_2019.csv',
  };
  try {
    const [housingData, macroCsvs] = await Promise.all([
      loadAndParseHousingCycleData(),
      Promise.all(Object.entries(macroPaths).map(async ([key, path]) => {
          const resp = await fetch(path);
          if (!resp.ok) { console.error(`Errore caricamento ${path}: ${resp.statusText}`); return { key, data: null }; }
          const csvText = await resp.text();
          return { key, data: parseGenericCsv(csvText) };
        })
      )
    ]);
    const macroData = {};
    macroCsvs.forEach(result => { if (result.data) macroData[result.key] = result.data; });
    return { housingData, macroData };
  } catch (err) {
    console.error('Errore generale nel caricamento dei dati per la Detail Page:', err);
    return { housingData: { regionalData: {}, laggingModelData: [], affordabilityMutuo90mq: [], healthIndexData: {} }, macroData: {} };
  }
};

// 8. Parser per i dati OMI completi
const parseOmiData = (csvString) => {
  if (!csvString) return {};
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return {};
  const headers = lines[0].split(',').map(h => h.trim());
  const dataByRegion = {};

  const colIdx = {
    periodo: headers.indexOf('Periodo'),
    regione: headers.indexOf('Regione'),
    prezzoMedio: headers.indexOf('Prezzo_medio')
  };

  if (Object.values(colIdx).includes(-1)) {
    console.error('Headers non trovati o errati nel dataset OMI.');
    return {};
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;

    const regionName = normalizeRegionName(values[colIdx.regione]);
    const periodo = values[colIdx.periodo]?.trim();
    const prezzo = parseFloat(values[colIdx.prezzoMedio]);

    if (!regionName || !periodo || isNaN(prezzo)) continue;

    if (!dataByRegion[regionName]) {
      dataByRegion[regionName] = {};
    }
    if (!dataByRegion[regionName][periodo]) {
      dataByRegion[regionName][periodo] = [];
    }
    dataByRegion[regionName][periodo].push(prezzo);
  }

  // Calcola la media per ogni regione e periodo
  const finalData = {};
  for (const region in dataByRegion) {
    finalData[region] = {};
    const sortedPeriods = Object.keys(dataByRegion[region]).sort((a, b) => {
      const [yearA, semA] = a.split('_S');
      const [yearB, semB] = b.split('_S');
      if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
      return parseInt(semA) - parseInt(semB);
    });

    for (const periodo of sortedPeriods) {
      const prices = dataByRegion[region][periodo];
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      finalData[region][periodo] = {
        avgPrice: avgPrice,
        period: periodo
      };
    }
  }
  return finalData;
};

// LOADER #3: Loader per i dati OMI
export const loadOmiData = async () => {
  try {
    const resp = await fetch('/Dati_Grafici/dati_completi_omi_2011_2024.csv');
    if (!resp.ok) {
      throw new Error(`Errore caricamento dati OMI: ${resp.statusText}`);
    }
    const csvText = await resp.text();
    return parseOmiData(csvText);
  } catch (err) {
    console.error('Errore nel caricamento dei dati OMI:', err);
    return {};
  }
};