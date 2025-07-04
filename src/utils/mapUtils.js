// src/utils/mapUtils.js

/**
 * Calcola le variazioni percentuali per una data metrica e anno rispetto all'anno precedente.
 * @param {object} regionalData - L'oggetto con i dati regionali.
 * @param {string} metric - La chiave della metrica (es. 'averagePrice').
 * @param {string} year - L'anno di riferimento per il calcolo della variazione.
 * @returns {object} - Un oggetto con nome regione come chiave e variazione % come valore.
 */
export const calculatePercentageChanges = (regionalData, metric, year) => {
  if (!regionalData || !metric || !year) return {};

  const previousYear = String(Number(year) - 1);
  const changes = {};

  for (const regionName in regionalData) {
    if (regionName === 'ITALIA' || !regionalData[regionName].length) continue;

    const currentYearData = regionalData[regionName].find(d => d.year === year);
    const previousYearData = regionalData[regionName].find(d => d.year === previousYear);

    if (currentYearData && previousYearData) {
      const currentValue = currentYearData[metric];
      const previousValue = previousYearData[metric];
      
      // Calcola la variazione solo se i dati sono validi e il valore precedente non è zero.
      if (typeof currentValue === 'number' && typeof previousValue === 'number' && previousValue !== 0) {
        const percentageChange = ((currentValue - previousValue) / previousValue) * 100;
        changes[regionName] = percentageChange;
      }
    }
  }
  return changes;
};


/**
 * Trova i valori minimo e massimo per una scala di variazioni, rendendola simmetrica.
 * Una scala simmetrica (es. -25% a +25%) è cruciale per confrontare crescite e cali.
 * @param {object} variationData - L'oggetto con le variazioni percentuali.
 * @returns {{min: number, max: number}}
 */
export const getMinMaxForVariation = (variationData) => {
  if (!variationData || Object.keys(variationData).length === 0) {
    return { min: 0, max: 0 };
  }

  const values = Object.values(variationData).filter(v => typeof v === 'number' && !isNaN(v));
  if (values.length === 0) return { min: 0, max: 0 };

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  
  // Trova il valore assoluto più grande per rendere la scala simmetrica attorno a zero.
  const absoluteMax = Math.max(Math.abs(minVal), Math.abs(maxVal));

  // Arrotonda per eccesso al multiplo di 5 più vicino per una legenda più pulita.
  const symmetricalLimit = Math.ceil(absoluteMax / 5) * 5;

  // Evita una scala 0-0 se non ci sono variazioni significative
  if (symmetricalLimit === 0) return { min: -1, max: 1 };

  return {
    min: -symmetricalLimit,
    max: symmetricalLimit,
  };
};

/**
 * Calcola un colore creando una scala divergente tra un colore di inizio e uno di fine,
 * passando per un colore neutro centrale per evitare mix indesiderati (es. viola tra rosso e blu).
 * QUESTA FUNZIONE È PERFETTA PER LA SCALA DI VARIAZIONE E RESTA INVARIATA.
 * @param {number} value - Il valore attuale (in questo caso, la variazione %).
 * @param {number} min - Il valore minimo della scala.
 * @param {number} max - Il valore massimo della scala.
 * @param {Array<number>} startColor - Colore per i valori negativi.
 * @param {Array<number>} endColor - Colore per i valori positivi.
 * @returns {string} - Colore in formato 'rgb(r, g, b)'.
 */
export const getColorForValue = (value, min, max, startColor, endColor) => {
  const midColor = [245, 245, 245]; // Grigio chiaro/bianco per il punto zero (nessuna variazione)

  if (max === min) {
    return `rgb(${startColor.join(',')})`;
  }

  // Per una scala simmetrica (es. -25, +25), il punto mediano sarà 0.
  const midPoint = (min + max) / 2;

  const interpolate = (c1, c2, r) => {
    const r_val = Math.round(c1[0] + r * (c2[0] - c1[0]));
    const g_val = Math.round(c1[1] + r * (c2[1] - c1[1]));
    const b_val = Math.round(c1[2] + r * (c2[2] - c1[2]));
    return `rgb(${r_val},${g_val},${b_val})`;
  };

  let fromColor, toColor, ratio;

  if (value <= midPoint) {
    // Valore negativo o nullo: interpola tra colore 'start' (cattivo/rosso) e 'mid' (neutro/bianco)
    fromColor = startColor;
    toColor = midColor;
    const range = midPoint - min;
    ratio = range === 0 ? 1 : (value - min) / range;
  } else {
    // Valore positivo: interpola tra 'mid' (neutro/bianco) e colore 'end' (buono/blu)
    fromColor = midColor;
    toColor = endColor;
    const range = max - midPoint;
    ratio = range === 0 ? 1 : (value - midPoint) / range;
  }
  
  const safeRatio = Math.max(0, Math.min(1, ratio));

  return interpolate(fromColor, toColor, safeRatio);
};