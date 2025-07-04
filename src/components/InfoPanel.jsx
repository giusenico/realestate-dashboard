import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './InfoPanel.css';
import { loadAndParseHousingCycleData, scaleTo100 } from '../utils/dataUtils';
import { FaSearch, FaEye, FaQuestionCircle, FaMapMarkedAlt } from 'react-icons/fa';

// Funzioni helper per la colorazione dinamica dei box regione
const interpolateColor = (color1, color2, factor) => {
  const result = color1.slice();
  for (let i = 0; i < 3; i++) {
    result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
  }
  return `rgb(${result.join(',')})`;
};

const getStyleForScore = (score) => {
  const red = [211, 47, 47];    // Un rosso più deciso ma non troppo acceso
  const yellow = [255, 193, 7];   // Giallo materiale
  const green = [56, 142, 60];    // Verde più scuro e bilanciato

  let color;

  if (score === null || isNaN(score)) {
    color = 'rgb(74, 85, 104)'; // Grigio neutro per dati mancanti
  } else if (score < 50) {
    // fattore da 0 (rosso) a 1 (giallo)
    const factor = score / 50;
    color = interpolateColor(red, yellow, factor);
  } else {
    // fattore da 0 (giallo) a 1 (verde)
    const factor = (score - 50) / 50;
    color = interpolateColor(yellow, green, factor);
  }
  
  return { 
    backgroundColor: color,
    backgroundImage: `linear-gradient(135deg, ${color}, rgba(0,0,0,0.7))`
  };
};

// 🎨 PALETTE COLORI E DETTAGLI FASI
const phaseDetails = {
  0: { id: 0, name: "Indeterminata", shortName: "INDET.", color: "#9E9E9E", icon: "❓", description: "Dati insufficienti o segnali contrastanti." },
  1: { id: 1, name: "Espansione", shortName: "ESPANS.", color: "#C6FF00", icon: "📈", description: "Aumento transazioni e prezzi, forte domanda." },
  2: { id: 2, name: "Rallentamento", shortName: "RALL.", color: "#FFC107", icon: "⚠️", description: "Transazioni in calo/stasi, prezzi ancora su." },
  3: { id: 3, name: "Contrazione", shortName: "CONTR.", color: "#FF9800", icon: "📉", description: "Calo transazioni, prezzi stabili/lieve calo." },
  4: { id: 4, name: "Recessione", shortName: "RECESS.", color: "#F44336", icon: "🔻", description: "Significativo calo transazioni e prezzi." },
  5: { id: 5, name: "Ripresa", shortName: "RIPRESA.", color: "#4CAF50", icon: "🔄", description: "Transazioni in aumento, prezzi stabili/fine calo." },
  6: { id: 6, name: "Nuova Espansione", shortName: "N.ESPANS.", color: "#8BC34A", icon: "🚀", description: "Aumento consolidato, nuovo ciclo." }
};

// 🔧 SOGLIE DI CALCOLO
const T_THRESHOLDS = {
  STRONG_POS: 20.13, MILD_POS: 8.04, MILD_NEG: -7.47, STRONG_NEG: -13.35,
};
const P_THRESHOLDS = {
  STRONG_POS: 1.26, MILD_POS: 0.20, MILD_NEG: -1.75, STRONG_NEG: -2.89,
};

function determineHousingCyclePhase(currentEntry, previousEntry) {
  if (!currentEntry || !previousEntry || currentEntry.originalTransactions == null || previousEntry.originalTransactions == null || currentEntry.priceVar == null) {
    return phaseDetails[0];
  }

  const tPrev = previousEntry.originalTransactions;
  const tCurr = currentEntry.originalTransactions;
  const pCurr = currentEntry.priceVar;
  
  if (tPrev === 0) return tCurr > 0 ? phaseDetails[5] : phaseDetails[0];

  const tChange = ((tCurr - tPrev) / tPrev) * 100;

  if (tChange >= T_THRESHOLDS.STRONG_POS && pCurr >= P_THRESHOLDS.STRONG_POS) return phaseDetails[6];
  if (tChange >= T_THRESHOLDS.MILD_POS && pCurr >= P_THRESHOLDS.MILD_POS) return phaseDetails[1];
  if (tChange < T_THRESHOLDS.MILD_POS && tChange > T_THRESHOLDS.STRONG_NEG && pCurr >= P_THRESHOLDS.MILD_POS) return phaseDetails[2];
  if (tChange <= T_THRESHOLDS.MILD_NEG && pCurr <= P_THRESHOLDS.MILD_NEG) return phaseDetails[4];
  if (tChange >= T_THRESHOLDS.MILD_POS && pCurr < P_THRESHOLDS.MILD_POS && pCurr > P_THRESHOLDS.STRONG_NEG) return phaseDetails[5];
  if (tChange <= T_THRESHOLDS.MILD_NEG && pCurr >= P_THRESHOLDS.MILD_NEG && pCurr < P_THRESHOLDS.MILD_POS) return phaseDetails[3];

  return phaseDetails[0];
}

// Componente per visualizzare le variazioni percentuali
const PercentageChangeIndicator = ({ value }) => {
  if (value === null || isNaN(value)) return <span className="mover-stat-value">-</span>;
  
  const isPositive = value >= 0;
  const indicatorClass = isPositive ? 'positive' : 'negative';
  const arrow = isPositive ? '▲' : '▼';
  
  return (
    <span className={`mover-stat-value ${indicatorClass}`}>
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
};

const HealthIndicator = ({ value, variation }) => {
  if (value === null || isNaN(value)) return <span className="mover-stat-value">-</span>;

  const getHealthColor = (val) => {
    if (val === null || isNaN(val)) return '';
    if (val > 70) return 'positive';
    if (val > 30) return 'neutral';
    return 'negative';
  };
  
  const renderVariation = () => {
    if (variation === null || isNaN(variation) || Math.round(variation) === 0) {
        return <span className="health-variation">Variazione: -</span>;
    }

    const variationClass = variation > 0 ? 'positive' : 'negative';
    const variationSign = variation > 0 ? '+' : '';

    return (
      <span className={`health-variation ${variationClass}`}>
        {variationSign}{variation.toFixed(0)}
      </span>
    );
  };

  return (
    <div className="health-indicator-main">
      <span className={`health-value ${getHealthColor(value)}`}>{value.toFixed(0)}</span>
      {renderVariation()}
    </div>
  );
};

const InfoPanel = ({ selectedFeature, onReset, onRegionSelect, allHousingData }) => {
  const [isLoadingHousingData, setIsLoadingHousingData] = useState(!allHousingData);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!allHousingData) {
      const fetchData = async () => {
        setIsLoadingHousingData(true);
        setIsLoadingHousingData(false);
      };
      fetchData();
    }
  }, [allHousingData]);

  const {
    displayFeatureNameForDetails,
    featureTypeForDetails,
    geoDisplayProps,
    regionKeyForCalculations,
  } = useMemo(() => {
    let details = {
      displayFeatureNameForDetails: 'Italia',
      featureTypeForDetails: 'Nazione',
      geoDisplayProps: null,
      regionKeyForCalculations: 'ITALIA',
    };
    const regionalData = allHousingData.regionalData || {};

    if (selectedFeature) {
      details.geoDisplayProps = selectedFeature;
      if (selectedFeature.COMUNE) {
        details.featureTypeForDetails = 'Comune';
        details.displayFeatureNameForDetails = selectedFeature.COMUNE;
      } else if (selectedFeature.DEN_UTS) {
        details.featureTypeForDetails = 'Provincia';
        details.displayFeatureNameForDetails = selectedFeature.DEN_UTS || selectedFeature.DEN_PROV;
      } else if (selectedFeature.DEN_REG) {
        details.featureTypeForDetails = 'Regione';
        details.displayFeatureNameForDetails = selectedFeature.DEN_REG;
      }
      
      if (selectedFeature.DEN_REG) {
        const normalizedRegName = selectedFeature.DEN_REG.toUpperCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
        if (regionalData[normalizedRegName]?.length > 0) {
          details.regionKeyForCalculations = normalizedRegName;
        }
      }
    }
    return details;
  }, [selectedFeature, allHousingData]);
  
  const dataForCalculations = useMemo(
    () => allHousingData.regionalData?.[regionKeyForCalculations] || [], 
    [allHousingData, regionKeyForCalculations]
  );
  
  const currentMarketPhase = useMemo(() => {
    if (dataForCalculations.length >= 2) {
      return determineHousingCyclePhase(dataForCalculations[dataForCalculations.length - 1], dataForCalculations[dataForCalculations.length - 2]);
    }
    return phaseDetails[0];
  }, [dataForCalculations]);

  const latestYear = useMemo(() => {
      if (dataForCalculations.length > 0) {
          for (let i = dataForCalculations.length - 1; i >= 0; i--) {
              if (dataForCalculations[i]?.year) {
                  return dataForCalculations[i].year;
              }
          }
      }
      return 'N/D';
  }, [dataForCalculations]);

  const topMovers = useMemo(() => {
    if (isLoadingHousingData || !allHousingData || !allHousingData.healthIndexData) {
      return { movers: [], level: '', subLevel: '' };
    }
    
    let moversData = [];
    const level = featureTypeForDetails;
    let subLevel = '';
    
    if (level === 'Nazione') {
      subLevel = 'Regioni';
      const regionKeys = Object.keys(allHousingData.healthIndexData).filter(k => k !== 'ITALIA');
      
      const latestDataPairs = regionKeys.map(key => {
        const regionData = allHousingData.healthIndexData[key];
        if (regionData && regionData.length > 0) {
            const last = regionData[regionData.length - 1];
            const prev = regionData.length > 1 ? regionData[regionData.length - 2] : null;
            return { last, prev };
        }
        return null;
      }).filter(Boolean);

      if (latestDataPairs.length > 0) {
        const healthScores = latestDataPairs.map(d => d.last.healthIndex).filter(v => v !== null);
        const healthRange = [Math.min(...healthScores), Math.max(...healthScores)];

        moversData = latestDataPairs.map(d => {
          const currentScore = scaleTo100(d.last.healthIndex, healthRange);
          
          let scoreVariation = null;
          if (d.prev && d.prev.healthIndex !== null && d.last.healthIndex !== null) {
              const previousScore = scaleTo100(d.prev.healthIndex, healthRange);
              if (currentScore !== null && previousScore !== null) {
                  scoreVariation = currentScore - previousScore;
              }
          }

          return {
            name: d.last.regionName.charAt(0).toUpperCase() + d.last.regionName.slice(1).toLowerCase(),
            healthIndex: currentScore,
            variation: scoreVariation,
            fasciaSalute: d.last.fasciaSalute || 'N/D',
            rawName: d.last.regionName,
          };
        });
        
        moversData.sort((a, b) => b.healthIndex - a.healthIndex);
      }
    } else if (level === 'Regione') {
      subLevel = 'Province';
    } else if (level === 'Provincia') {
      subLevel = 'Comuni';
    }
    
    return { movers: moversData.slice(0, 5), level, subLevel };
  }, [allHousingData, isLoadingHousingData, featureTypeForDetails]);

  const renderRankingSection = () => {
    const { movers, level, subLevel } = topMovers;

    const shouldRender = ['Nazione', 'Regione', 'Provincia'].includes(level);
    if (!shouldRender) return null;

    if (movers.length === 0) {
      return (
        <div className="top-movers-section">
          <div className="section-header">
            <h4>Top 5 {subLevel}</h4>
            <span className="section-subtitle">Classificati per indice di salute</span>
          </div>
          <div className="mover-placeholder">
            <p>Dati di dettaglio per {subLevel.toLowerCase()} non ancora disponibili.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="top-movers-section">
        <div className="section-header">
          <h4>Top 5 {subLevel}</h4>
          <span className="section-subtitle">Classificati per indice di salute</span>
        </div>
        <ul className="movers-list-apple">
          {movers.map((mover, index) => (
            <li 
              key={index} 
              className="mover-item-apple"
              style={getStyleForScore(mover.healthIndex)}
              onClick={() => onRegionSelect({ DEN_REG: mover.rawName })}
            >
              <div className="mover-region-info">
                <span className="mover-name-apple">{mover.name}</span>
                <span className="mover-fascia-salute">{mover.fasciaSalute}</span>
              </div>
              <div className="mover-performance-apple">
                <HealthIndicator value={mover.healthIndex} variation={mover.variation} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  const renderDetailsOrPlaceholder = () => {
    if (!allHousingData) {
       return renderPlaceholder("Dati non disponibili. Impossibile caricare le informazioni.");
    }
    const italiaData = allHousingData.regionalData?.['ITALIA'];
    if (!selectedFeature && !isLoadingHousingData && (!italiaData || italiaData.length === 0)) {
      return renderPlaceholder("Dati non disponibili. Impossibile caricare le informazioni nazionali.");
    }
    if (!selectedFeature) {
      return renderFeatureDetails('Italia', 'Nazione', null, onReset);
    }
    return renderFeatureDetails(displayFeatureNameForDetails, featureTypeForDetails, geoDisplayProps, onReset);
  };

  const renderFeatureDetails = (name, type, props, onResetCallback) => {
    const detailPageSlug = name.toLowerCase().replace(/ /g, '-').replace(/'/g, 'd-');

    return (
      <div className="feature-details-container">
        <div className="region-header">
          <div className="region-title-area">
            <h3>{name}</h3>
            {type && <span className="feature-type-badge">{type}</span>}
          </div>
          <div className="header-actions">
            <Link to={`/dettagli/${detailPageSlug}`} className="discover-more-button" title={`Scopri di più su ${name}`} state={{ featureType: type, properties: props }}>
              <FaEye className="btn-icon" aria-hidden="true" />
              <span className="btn-text">Dettagli</span>
            </Link>
            {type !== 'Nazione' && <button onClick={() => onResetCallback(null)} className="reset-button" title="Resetta la vista">×</button>}
          </div>
        </div>
        
        <div className="market-phase-section">
          <div className="section-header">
            <h4>Fase Ciclo Mercato</h4>
            <span className="section-subtitle">Aggiornato al {latestYear}</span>
          </div>
          {currentMarketPhase.id !== 0 ? (
            <div className="market-phase-box" style={{borderColor: currentMarketPhase.color}}>
              <div className="phase-icon" style={{backgroundColor: currentMarketPhase.color}}></div>
              <div className="phase-content">
                <h5 style={{color: currentMarketPhase.color}}>{currentMarketPhase.name}</h5>
                <p>{currentMarketPhase.description}</p>
              </div>
            </div>
          ) : (
            <div className="market-phase-box indeterminate">
              <div className="phase-icon"><FaQuestionCircle /></div>
              <div className="phase-content">
                <h5>{currentMarketPhase.name}</h5>
                <p>Dati insufficienti per calcolare la fase del ciclo per questa area.</p>
              </div>
            </div>
          )}
        </div>

        {renderRankingSection()}
        
        {props && (
          <div className="geo-data-section">
            <div className="section-header">
              <h4>Dati Geografici</h4>
              <span className="section-subtitle">Informazioni territoriali</span>
            </div>
            <ul className="geo-data-list">
              {props.COD_REG && (
                <li>
                  <div className="data-label">Codice Regione</div>
                  <div className="data-value">{props.COD_REG}</div>
                </li>
              )}
              {props.DEN_REG && type !== 'Regione' && (
                <li>
                  <div className="data-label">Regione</div>
                  <div className="data-value">{props.DEN_REG}</div>
                </li>
              )}
              {props.COD_PROV && (
                <li>
                  <div className="data-label">Codice Provincia</div>
                  <div className="data-value">{props.COD_PROV}</div>
                </li>
              )}
              {props.DEN_UTS && type === 'Comune' && (
                <li>
                  <div className="data-label">Provincia</div>
                  <div className="data-value">{props.DEN_UTS}</div>
                </li>
              )}
              {props.PRO_COM_T && (
                <li>
                  <div className="data-label">Codice ISTAT</div>
                  <div className="data-value">{props.PRO_COM_T}</div>
                </li>
              )}
              {props.Shape_Area && (
                <li>
                  <div className="data-label">Area</div>
                  <div className="data-value">{Math.round(props.Shape_Area / 1000000).toLocaleString('it-IT')} km²</div>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }
  
  const renderPlaceholder = (message = "Seleziona un'area sulla mappa per visualizzare i dettagli.") => (
    <div className="placeholder-view">
      <div className="placeholder-icon"><FaMapMarkedAlt size={46} /></div>
      <p className="placeholder-text">{message}</p>
    </div>
  );
  
  return (
    <aside className="info-panel">
      <div className="panel-header">
        <div className="title-area">
          <h1>Dashboard Immobiliare</h1>
          <p className="intro-text">Analisi interattiva del mercato italiano.</p>
        </div>
        <div className="search-bar">
          <FaSearch className="search-icon" aria-hidden="true" />
          <input 
            type="text" 
            placeholder="Cerca regione, provincia, comune..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="button" aria-label="Cerca">Cerca</button>
        </div>
      </div>

      <div className="panel-content">
        {isLoadingHousingData ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Caricamento dati in corso...</p>
          </div>
        ) : renderDetailsOrPlaceholder()}
      </div>

      <footer className="panel-footer">
        <p>© {new Date().getFullYear()} Dashboard Immobiliare</p>
      </footer>
    </aside>
  );
};

export default InfoPanel;