import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './InfoPanel.css';
import HousingCycleChart from './HousingCycleChart';
import { loadAndParseHousingCycleData } from '../utils/dataUtils';

// In src/components/InfoPanel.js

// ... (tutti gli import e altro codice restano uguali)

// 🎨 NUOVA PALETTE COLORI PER LE FASI DEL CICLO
// Più intuitiva e professionale, come richiesto.
const phaseDetails = {
  0: { id: 0, name: "Indeterminata", shortName: "INDET.", color: "#9E9E9E", description: "Dati insufficienti o segnali contrastanti." },
  1: { id: 1, name: "Espansione", shortName: "ESPANS.", color: "#C6FF00", description: "Aumento transazioni e prezzi, forte domanda." }, // Verde lime
  2: { id: 2, name: "Rallentamento", shortName: "RALL.", color: "#FFC107", description: "Transazioni in calo/stasi, prezzi ancora su." }, // Ambra/Giallo
  3: { id: 3, name: "Contrazione", shortName: "CONTR.", color: "#FF9800", description: "Calo transazioni, prezzi stabili/lieve calo." }, // Arancione
  4: { id: 4, name: "Recessione", shortName: "RECESS.", color: "#F44336", description: "Significativo calo transazioni e prezzi." }, // Rosso
  5: { id: 5, name: "Ripresa", shortName: "RIPRESA", color: "#4CAF50", description: "Transazioni in aumento, prezzi stabili/fine calo." }, // Verde
  6: { id: 6, name: "Nuova Espansione", shortName: "N.ESPANS.", color: "#8BC34A", description: "Aumento consolidato, nuovo ciclo." } // Verde chiaro
};

// ... (il resto del file InfoPanel.js rimane identico)

// 🔧 Spostate fuori dal componente per non ricrearle a ogni render
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

const InfoPanel = ({ selectedFeature, onReset }) => {
  const [allHousingData, setAllHousingData] = useState({});
  const [isLoadingHousingData, setIsLoadingHousingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingHousingData(true);
      const data = await loadAndParseHousingCycleData();
      setAllHousingData(data);
      setIsLoadingHousingData(false);
    };
    fetchData();
  }, []);

  const {
    displayFeatureNameForDetails,
    featureTypeForDetails,
    geoDisplayProps,
    regionKeyForCalculations,
    titleForChartSection
  } = useMemo(() => {
    let details = {
      displayFeatureNameForDetails: 'Italia',
      featureTypeForDetails: 'Nazione',
      geoDisplayProps: null,
      regionKeyForCalculations: 'ITALIA',
      titleForChartSection: 'Italia'
    };
    // <<< MODIFICA 1: Usiamo allHousingData.regionalData per i controlli
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
        // <<< MODIFICA 2: Controlliamo dentro regionalData
        if (regionalData[normalizedRegName]?.length > 0) {
          details.regionKeyForCalculations = normalizedRegName;
          details.titleForChartSection = selectedFeature.DEN_REG;
        // <<< MODIFICA 3: Controlliamo se regionalData ha delle chiavi
        } else if (Object.keys(regionalData).length > 0 && !isLoadingHousingData) {
          details.titleForChartSection = `${selectedFeature.DEN_REG} (Dati Italia)`;
        }
      }
    }
    return details;
  }, [selectedFeature, allHousingData, isLoadingHousingData]);
  
  // <<< MODIFICA 4 (CRUCIALE): Estraiamo i dati da allHousingData.regionalData
  const dataForCalculations = useMemo(
    () => allHousingData.regionalData?.[regionKeyForCalculations] || [], 
    [allHousingData, regionKeyForCalculations]
  );

  const latestStats = useMemo(() => {
    if (dataForCalculations.length > 0) {
      for (let i = dataForCalculations.length - 1; i >= 0; i--) {
        const entry = dataForCalculations[i];
        if (entry && entry.originalTransactions != null && entry.averagePrice != null) {
          return { year: entry.year, properties: entry.originalTransactions, avgPrice: entry.averagePrice };
        }
      }
    }
    return { year: null, properties: null, avgPrice: null };
  }, [dataForCalculations]);

  const currentMarketPhase = useMemo(() => {
    if (dataForCalculations.length >= 2) {
      return determineHousingCyclePhase(dataForCalculations[dataForCalculations.length - 1], dataForCalculations[dataForCalculations.length - 2]);
    }
    return phaseDetails[0];
  }, [dataForCalculations]);
  
  const historicalPhaseBlocks = useMemo(() => {
    if (dataForCalculations.length < 2) return [];
    const blocks = [];
    let activeBlock = null;

    for (let i = 1; i < dataForCalculations.length; i++) {
      const currentPhase = determineHousingCyclePhase(dataForCalculations[i], dataForCalculations[i - 1]);
      if (!activeBlock) {
        activeBlock = {
          startYear: dataForCalculations[i].year,
          phaseId: currentPhase.id,
          phaseName: currentPhase.name,
          phaseShortName: currentPhase.shortName,
          phaseColor: currentPhase.color,
        };
      } else if (currentPhase.id !== activeBlock.phaseId) {
        activeBlock.endYear = dataForCalculations[i - 1].year;
        blocks.push(activeBlock);
        activeBlock = {
          startYear: dataForCalculations[i].year,
          phaseId: currentPhase.id,
          phaseName: currentPhase.name,
          phaseShortName: currentPhase.shortName,
          phaseColor: currentPhase.color,
        };
      }
    }
    if (activeBlock) {
      activeBlock.endYear = dataForCalculations[dataForCalculations.length - 1].year;
      blocks.push(activeBlock);
    }
    return blocks;
  }, [dataForCalculations]);

  const renderHousingCycleSection = () => {
    if (isLoadingHousingData) return null;
    
    // <<< MODIFICA 5: Controlla l'assenza di regionalData o se è vuoto
    if (!allHousingData.regionalData || Object.keys(allHousingData.regionalData).length === 0) {
      return <div className="chart-placeholder"><p>Errore nel caricamento dei dati del ciclo immobiliare.</p></div>;
    }
    if (!dataForCalculations || dataForCalculations.length === 0) {
        const msg = `Dati non disponibili per ${titleForChartSection.replace(" (Dati Italia)","")}.`;
        return <div className="chart-placeholder"><p>{msg}</p></div>;
    }
    return (
      <div className="chart-section">
        <div className="housing-cycle-header" style={{ backgroundColor: currentMarketPhase.id !== 0 ? hexToRgba(currentMarketPhase.color, 0.3) : 'var(--glass-bg)' }}>
          <h4>Ciclo Immobiliare: {titleForChartSection}</h4>
        </div>
        <HousingCycleChart 
          data={dataForCalculations} 
          phaseBlocks={historicalPhaseBlocks}
          thresholds={P_THRESHOLDS}
        />
      </div>
    );
  };
  
  const renderDetailsOrPlaceholder = () => {
    // <<< MODIFICA 6: Controlla i dati di 'ITALIA' dentro regionalData
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
    const yearForPhaseDisplay = latestStats.year || 'N/D';

    return (
      <div className="feature-details-container">
        <div className="region-header">
          <div>
            <h3>{name}</h3>
            {type && <span className="feature-type-badge">{type}</span>}
          </div>
          <div className="header-actions">
            <Link to={`/dettagli/${detailPageSlug}`} className="discover-more-button" title={`Scopri di più su ${name}`} state={{ featureType: type, properties: props }}>
              Scopri di più
            </Link>
            {type !== 'Nazione' && <button onClick={() => onResetCallback(null)} className="reset-button" title="Resetta la vista">×</button>}
          </div>
        </div>
        
        {currentMarketPhase?.id !== 0 && (
          <div className="market-phase-section">
            <h4>Fase Ciclo Mercato ({yearForPhaseDisplay})</h4>
            <div className="market-phase-box" style={{borderColor: currentMarketPhase.color}}>
              <h5 style={{color: currentMarketPhase.color}}>{currentMarketPhase.name}</h5>
              <p>{currentMarketPhase.description}</p>
            </div>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{latestStats.properties !== null ? latestStats.properties.toLocaleString('it-IT') : 'N/D'}</span>
            <span className="stat-label">Transazioni ({latestStats.year || 'N/D'})</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{latestStats.avgPrice !== null ? `€ ${latestStats.avgPrice.toLocaleString('it-IT')}` : 'N/D'}</span>
            <span className="stat-label">Prezzo / m² ({latestStats.year || 'N/D'})</span>
          </div>
        </div>

        {props && (
          <div className="geo-data-section">
            <h4>Dati Geografici</h4>
            <ul>
              {props.COD_REG && <li><strong>Codice Regione:</strong> <span>{props.COD_REG}</span></li>}
              {props.DEN_REG && type !== 'Regione' && <li><strong>Regione:</strong> <span>{props.DEN_REG}</span></li>}
              {props.COD_PROV && <li><strong>Codice Provincia:</strong> <span>{props.COD_PROV}</span></li>}
              {props.DEN_UTS && type === 'Comune' && <li><strong>Provincia:</strong> <span>{props.DEN_UTS}</span></li>}
              {props.PRO_COM_T && <li><strong>Codice ISTAT:</strong> <span>{props.PRO_COM_T}</span></li>}
              {props.Shape_Area && <li><strong>Area:</strong> <span>{Math.round(props.Shape_Area / 1000000).toLocaleString('it-IT')} km²</span></li>}
            </ul>
          </div>
        )}
      </div>
    );
  }
  
  const renderPlaceholder = (message = "Seleziona un'area sulla mappa per visualizzare i dettagli.") => (
    <div className="placeholder-view"><p className="placeholder-text">{message}</p></div>
  );

  const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(128, 128, 128, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <aside className="info-panel">
      <div className="panel-header">
        <h1>Dashboard Immobiliare</h1>
        <p className="intro-text">Analisi interattiva del mercato italiano.</p>
        <div className="search-bar">
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
        {isLoadingHousingData ? renderPlaceholder("Caricamento dati...") : renderDetailsOrPlaceholder()}
        {renderHousingCycleSection()}
      </div>

      <footer className="panel-footer">
        <p>© {new Date().getFullYear()} Dashboard Immobiliare</p>
      </footer>
    </aside>
  );
};

export default InfoPanel;