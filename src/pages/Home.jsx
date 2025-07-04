// src/pages/Home.jsx
import React, { useState, useCallback, useEffect } from 'react'; // Aggiungi useEffect
import MapChart from '../components/MapChart';
import InfoPanel from '../components/InfoPanel';
import RegionDetailDrawer from '../components/RegionDetailDrawer';
import './Home.css';
import { loadAndParseHousingCycleData, normalizeRegionName } from '../utils/dataUtils'; // IMPORTA LA FUNZIONE DI CARICAMENTO

const Home = () => {
  // Stato originale per la feature selezionata (corretto)
  const [selectedFeature, setSelectedFeature] = useState(null);
  
  // NUOVO: Stato per contenere i dati caricati e per il loading
  const [housingData, setHousingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerRegionData, setDrawerRegionData] = useState(null);

  // NUOVO: Effetto per caricare i dati una sola volta all'avvio
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await loadAndParseHousingCycleData();
      setHousingData(data);
      setLoading(false);
    };
    fetchData();
  }, []); // L'array vuoto [] assicura che venga eseguito solo all'inizio

  // Handler originale (corretto)
  const handleFeatureSelect = useCallback((properties) => {
    setSelectedFeature(properties);
  }, []);

  const handleRegionSelectFromList = (regionIdentifier) => {
    if (!housingData || !housingData.healthIndexData) return;
    
    const regionName = normalizeRegionName(regionIdentifier.DEN_REG);
    const healthDataForRegion = housingData.healthIndexData[regionName];

    if (healthDataForRegion && healthDataForRegion.length > 0) {
      const latestData = healthDataForRegion[healthDataForRegion.length - 1];
      setDrawerRegionData({
        ...latestData,
        name: regionName.charAt(0).toUpperCase() + regionName.slice(1).toLowerCase(),
      });
    }
  };

  const handleDrawerClose = () => {
    setDrawerRegionData(null);
  };

  // NUOVO: Mostra un messaggio di caricamento mentre i dati non sono pronti
  if (loading || !housingData) {
    return <div className="loading-screen">Caricamento dati...</div>;
  }

  // Il tuo JSX originale, con l'aggiunta della prop 'regionalData'
  return (
    <div className={`home-page ${drawerRegionData ? 'drawer-open' : ''}`}>
      <div className="sidebar">
        <InfoPanel 
          selectedFeature={selectedFeature} 
          onReset={() => handleFeatureSelect(null)} // Leggermente migliorato per chiarezza
          // Passiamo anche i dati all'InfoPanel, probabilmente gli serviranno
          allHousingData={housingData}
          onRegionSelect={handleRegionSelectFromList}
        />
        <RegionDetailDrawer
          regionData={drawerRegionData}
          onClose={handleDrawerClose}
        />
      </div>
      <div className="map-container">
        <MapChart 
          onFeatureSelect={handleFeatureSelect} 
          selectedFeature={selectedFeature}
          // LA MODIFICA CHIAVE È QUI: Passa i dati alla mappa
          regionalData={housingData.regionalData}
          healthData={housingData.healthIndexData}
          drawerRegion={drawerRegionData}
        />
      </div>
    </div>
  );
};

export default Home;