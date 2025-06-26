// src/pages/DetailPage.jsx

import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import ItaliaCharts from "../components/ItaliaCharts";
import HousingCycleChart from "../components/HousingCycleChart";
import { useGeoJSON } from "../hooks/useGeoJSON";
import { loadAllDataForDetailPage } from "../utils/dataUtils";
import FloatingChatbot from "../components/FloatingChatbot";
import MiniMap from "../components/MiniMap";
import "./DetailPage.css";

// Logica ciclo immobiliare (invariata)
const phaseDetails = { 0: { id: 0, name: "Indeterminata", shortName: "INDET.", color: "#9E9E9E" }, 1: { id: 1, name: "Espansione", shortName: "ESPANS.", color: "#C6FF00" }, 2: { id: 2, name: "Rallentamento", shortName: "RALL.", color: "#FFC107" }, 3: { id: 3, name: "Contrazione", shortName: "CONTR.", color: "#FF9800" }, 4: { id: 4, name: "Recessione", shortName: "RECESS.", color: "#F44336" }, 5: { id: 5, name: "Ripresa", shortName: "RIPRESA.", color: "#4CAF50" }, 6: { id: 6, name: "Nuova Espansione", shortName: "N.ESPANS.", color: "#8BC34A" } };
const T_THRESHOLDS = { STRONG_POS: 20.13, MILD_POS: 8.04, MILD_NEG: -7.47, STRONG_NEG: -13.35 };
const P_THRESHOLDS = { STRONG_POS: 1.26, MILD_POS: 0.20, MILD_NEG: -1.75, STRONG_NEG: -2.89 };
function determineHousingCyclePhase(currentEntry, previousEntry) { if (!currentEntry || !previousEntry || currentEntry.originalTransactions == null || currentEntry.priceVar == null) return phaseDetails[0]; const tPrev = previousEntry.originalTransactions; const tCurr = currentEntry.originalTransactions; const pCurr = currentEntry.priceVar; if (tPrev === 0) return tCurr > 0 ? phaseDetails[5] : phaseDetails[0]; const tChange = ((tCurr - tPrev) / tPrev) * 100; if (tChange >= T_THRESHOLDS.STRONG_POS && pCurr >= P_THRESHOLDS.STRONG_POS) return phaseDetails[6]; if (tChange >= T_THRESHOLDS.MILD_POS && pCurr >= P_THRESHOLDS.MILD_POS) return phaseDetails[1]; if (tChange < T_THRESHOLDS.MILD_POS && tChange > T_THRESHOLDS.STRONG_NEG && pCurr >= P_THRESHOLDS.MILD_POS) return phaseDetails[2]; if (tChange <= T_THRESHOLDS.MILD_NEG && pCurr <= P_THRESHOLDS.MILD_NEG) return phaseDetails[4]; if (tChange >= T_THRESHOLDS.MILD_POS && pCurr < P_THRESHOLDS.MILD_POS && pCurr > P_THRESHOLDS.STRONG_NEG) return phaseDetails[5]; if (tChange <= T_THRESHOLDS.MILD_NEG && pCurr >= P_THRESHOLDS.MILD_NEG && pCurr < P_THRESHOLDS.MILD_POS) return phaseDetails[3]; return phaseDetails[0]; }
function generateHistoricalPhaseBlocks(data) { if (data.length < 2) return []; const blocks = []; let activeBlock = null; for (let i = 1; i < data.length; i++) { const currentPhase = determineHousingCyclePhase(data[i], data[i - 1]); if (!activeBlock) { activeBlock = { startYear: data[i].year, endYear: data[i].year, phaseShortName: currentPhase.shortName, phaseColor: currentPhase.color, phaseId: currentPhase.id }; } else if (currentPhase.id !== activeBlock.phaseId) { blocks.push(activeBlock); activeBlock = { startYear: data[i].year, endYear: data[i].year, phaseShortName: currentPhase.shortName, phaseColor: currentPhase.color, phaseId: currentPhase.id }; } else { activeBlock.endYear = data[i].year; } } if (activeBlock) blocks.push(activeBlock); return blocks; }
const normalizeStringForSearch = (str) => { if (!str) return ""; return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-']/g, ""); };

const DetailPage = () => {
  const { slug } = useParams();
  const { state } = useLocation();
  const { data: regioniData, loading: loadingRegioni } = useGeoJSON("/data/regioni.json");
  const { data: provinceData, loading: loadingProvince } = useGeoJSON("/data/provincie.json");
  const { data: comuniData, loading: loadingComuni } = useGeoJSON("/data/comuni.json");
  const [allHousingData, setAllHousingData] = useState({ regionalData: {}, laggingModelData: [], affordabilityMutuo90mq: [] });
  const [macroData, setMacroData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [featureData, setFeatureData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { housingData, macroData: loadedMacroData } = await loadAllDataForDetailPage();
        setAllHousingData(housingData || { regionalData: {}, laggingModelData: [], affordabilityMutuo90mq: [] });
        setMacroData(loadedMacroData || {});
      } catch (error) { 
        console.error("Errore nel caricamento dati in DetailPage:", error); 
        setError("Errore nel caricamento dei dati.");
      } 
      finally { setIsLoadingData(false); }
    };
    fetchData();
  }, []);
  
  const isLoading = loadingRegioni || loadingProvince || loadingComuni || isLoadingData;
  const normalizedSlug = useMemo(() => normalizeStringForSearch(slug), [slug]);
  
  useEffect(() => {
    if (isLoading) return;
    setError(null);
    let found = null;
    if (state?.properties) {
      const { featureType, properties } = state;
      let geoData;
      if (featureType === "Regione") geoData = regioniData?.features.find(f => f.properties.COD_REG === properties.COD_REG);
      else if (featureType === "Provincia") geoData = provinceData?.features.find(f => f.properties.COD_PROV === properties.COD_PROV);
      else if (featureType === "Comune") geoData = comuniData?.features.find(f => f.properties.PRO_COM_T === properties.PRO_COM_T);
      if (geoData) found = { ...geoData, appType: featureType };
    } else {
      if (normalizedSlug === "italia") { found = { type: "Feature", appType: "Nazione", properties: { DEN_REG: "Italia" }, geometry: null }; } 
      else {
        let searchResult = comuniData?.features.find(f => normalizeStringForSearch(f.properties.DEN_PCM) === normalizedSlug) || provinceData?.features.find(f => normalizeStringForSearch(f.properties.DEN_UTS) === normalizedSlug) || regioniData?.features.find(f => normalizeStringForSearch(f.properties.DEN_REG) === normalizedSlug);
        if (searchResult) { let appType = searchResult.properties.DEN_PCM ? "Comune" : (searchResult.properties.DEN_UTS ? "Provincia" : "Regione"); found = { ...searchResult, appType }; }
      }
    }
    if (found) setFeatureData(found);
    else setError(`Nessun dato trovato per “${slug}”.`);
  }, [state, slug, isLoading, regioniData, provinceData, comuniData, normalizedSlug]);
    
  // MODIFICA QUI: L'hook useMemo ora crea un pacchetto dati completo per il chatbot.
  const { nationalDataForChart, regionalDataForChart, laggingDataForChart, latestYearStats, previousYearStats, dataForChatbot, currentPhase, latestAffordabilityData, previousAffordabilityData } = useMemo(() => {
    const defaultReturn = { nationalDataForChart: [], regionalDataForChart: [], laggingDataForChart: [], latestYearStats: {}, previousYearStats: null, dataForChatbot: null, currentPhase: phaseDetails[0], latestAffordabilityData: null, previousAffordabilityData: null };
    if (!featureData || !allHousingData.regionalData || Object.keys(allHousingData.regionalData).length === 0 || !macroData) {
        return defaultReturn;
    }
    
    const { appType, properties } = featureData;
    const displayName = properties.DEN_PCM || properties.COMUNE || properties.DEN_UTS || properties.DEN_PROV || properties.DEN_REG || "Italia";
    const italiaKey = 'ITALIA';
    let dataKey = appType === 'Nazione' ? italiaKey : (properties.DEN_REG || '').toUpperCase().replace(/-/g, ' ').replace(/\s+/g, ' ');
    const dataSet = allHousingData.regionalData[dataKey] || [];
    
    const latest = dataSet.length > 0 ? dataSet[dataSet.length - 1] : {};
    const previous = dataSet.length > 1 ? dataSet[dataSet.length - 2] : null;
    
    let phase = (dataSet.length >= 2) ? determineHousingCyclePhase(latest, previous) : phaseDetails[0];
    const nationalData = allHousingData.regionalData[italiaKey] || [];
    const laggingData = allHousingData.laggingModelData || [];
    
    let affordabilityLatest = null, affordabilityPrevious = null;
    if (allHousingData.affordabilityMutuo90mq && allHousingData.affordabilityMutuo90mq.length > 0) {
        const sortedAffordability = [...allHousingData.affordabilityMutuo90mq].sort((a, b) => b.year.localeCompare(a.year));
        affordabilityLatest = sortedAffordability[0];
        if (sortedAffordability.length > 1) affordabilityPrevious = sortedAffordability[1];
    }
    
    // MODIFICA: Questo oggetto ora contiene TUTTI i dati necessari per il chatbot.
    const chatDataPackage = {
      displayName,
      nationalData,
      laggingData,
      affordabilityData: allHousingData.affordabilityMutuo90mq, // Aggiunto
      macroData, // Aggiunto
      latestYearStats: latest,
      currentPhase: phase,
    };

    return { 
      nationalDataForChart: nationalData, 
      regionalDataForChart: dataSet, 
      laggingDataForChart: laggingData, 
      latestYearStats: latest, 
      previousYearStats: previous,
      dataForChatbot: chatDataPackage, // Passiamo il pacchetto completo
      currentPhase: phase, 
      latestAffordabilityData: affordabilityLatest,
      previousAffordabilityData: affordabilityPrevious
    };
  }, [featureData, allHousingData, macroData]); // MODIFICA: Aggiunto macroData alle dipendenze

  const regionalPhaseBlocks = useMemo(() => generateHistoricalPhaseBlocks(regionalDataForChart), [regionalDataForChart]);

  if (isLoading) return <div className="detail-page-status"><h1>Caricamento…</h1></div>;
  if (error) return <div className="detail-page-status"><h1>{error}</h1><Link to="/" className="back-button">← Torna alla Dashboard</Link></div>;
  if (!featureData) return <div className="detail-page-status"><h1>Ricerca per “{slug}”…</h1></div>;

  const { appType: type, properties } = featureData;
  const displayName = properties.DEN_PCM || properties.COMUNE || properties.DEN_UTS || properties.DEN_PROV || properties.DEN_REG || "Dettaglio";
  
  const renderGeographicInfo = () => ( <div className="info-card"><h3>Informazioni Geografiche</h3><ul>{properties.COD_REG && <li><strong>Codice Regione:</strong> <span>{properties.COD_REG}</span></li>}{type !== "Regione" && type !== "Nazione" && properties.DEN_REG && <li><strong>Regione:</strong> <span>{properties.DEN_REG}</span></li>}{properties.COD_PROV && <li><strong>Codice Provincia:</strong> <span>{properties.COD_PROV}</span></li>}{type === "Comune" && (properties.DEN_UTS || properties.DEN_PROV) && <li><strong>Provincia:</strong> <span>{properties.DEN_UTS || properties.DEN_PROV}</span></li>}{properties.Shape_Area && <li><strong>Superficie:</strong> <span>{(properties.Shape_Area / 1e6).toLocaleString("it-IT", { maximumFractionDigits: 2 })} km²</span></li>}</ul></div>);
  const getComparison = (current, previous) => { if (current == null || previous == null || previous === 0) return null; const change = ((current - previous) / previous) * 100; const color = change > 0 ? '#4CAF50' : '#F44336'; return <span className="stat-comparison" style={{ color }}>({change > 0 ? '+' : ''}{change.toFixed(1)}%)</span>; };
  const getIndexComparison = (current, previous) => { if (current == null || previous == null) return null; const change = current - previous; const color = change > 0 ? '#4CAF50' : '#F44336'; return <span className="stat-comparison" style={{ color }}>({change > 0 ? '+' : ''}{change.toFixed(1)})</span>; }

  return (
    <div className="detail-page">
      <div className="top-layout-grid">
        <header className="detail-header">
          <div className="title-group"><h1>{displayName}</h1><span className={`feature-type-badge detail-badge type-${type.toLowerCase()}`}>{type}</span></div>
          <Link to="/" className="back-button">← Torna alla Dashboard</Link>
        </header>
        
        <div className="stats-grid">
            <div className="stat-item"><span className="stat-value">{latestYearStats.averagePrice ? latestYearStats.averagePrice.toLocaleString('it-IT', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0}) : 'N/D'}{getComparison(latestYearStats.averagePrice, previousYearStats?.averagePrice)}</span><span className="stat-label">Prezzo / m² ({latestYearStats.year || '...'})</span></div>
            <div className="stat-item"><span className="stat-value">{latestYearStats.originalTransactions ? latestYearStats.originalTransactions.toLocaleString('it-IT') : 'N/D'}{getComparison(latestYearStats.originalTransactions, previousYearStats?.originalTransactions)}</span><span className="stat-label">Transazioni ({latestYearStats.year || '...'})</span></div>
            <div className="stat-item"><span className="stat-value" style={{ color: currentPhase.color }}>{currentPhase.name}</span><span className="stat-label">Fase Ciclo Attuale</span></div>
            <div className="stat-item" title="Questo score misura la sostenibilità di un mutuo a 20/25 anni per l'acquisto di un immobile da 90mq. Valori più alti indicano una maggiore sostenibilità dell'acquisto."><span className="stat-value">{latestAffordabilityData?.sustainability20 != null ? latestAffordabilityData.sustainability20.toLocaleString('it-IT', { maximumFractionDigits: 0 }) : 'N/D'}{getIndexComparison(latestAffordabilityData?.sustainability20, previousAffordabilityData?.sustainability20)}</span><span className="stat-label">Sostenibilità Acquisto (20a)<span className="info-icon">(i)</span></span></div>
        </div>

        <div className="map-column"><MiniMap feature={featureData} backgroundGeoData={regioniData} /></div>

        <div className="main-content-column">
            {type === "Nazione" ? (
                <ItaliaCharts 
                    italiaData={nationalDataForChart} 
                    laggingModelData={laggingDataForChart} 
                    allRegionalData={allHousingData.regionalData} 
                    affordabilityData={allHousingData.affordabilityMutuo90mq}
                    macroData={macroData}
                />
            ) : (
            <>
                {renderGeographicInfo()}
                <div className="info-card"><h3>Analisi del Ciclo Immobiliare</h3>{regionalDataForChart.length > 0 ? (<HousingCycleChart data={regionalDataForChart} phaseBlocks={regionalPhaseBlocks} currentPhaseName={currentPhase.name} currentPhaseColor={currentPhase.color}/>) : (<p style={{ padding: '1.5rem', textAlign: 'center' }}>Dati del ciclo immobiliare non disponibili per <strong>{displayName}</strong>.</p>)}</div>
            </>
            )}
        </div>
      </div>
      
      {dataForChatbot && (<FloatingChatbot graphData={dataForChatbot} />)}
    </div>
  );
};

export default DetailPage;