// src/pages/Home.jsx
import React, { useState, useCallback } from 'react';
import MapChart from '../components/MapChart';
import InfoPanel from '../components/InfoPanel';
import './Home.css';

const Home = () => {
  // Unico stato per la feature selezionata (regione, provincia o comune)
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Unico handler che riceve le proprietà della feature cliccata dalla mappa
  const handleFeatureSelect = useCallback((properties) => {
    setSelectedFeature(properties);
  }, []);

  return (
    <div className="home-page">
      <div className="map-container">
        {/* Passiamo l'handler e la feature selezionata alla mappa */}
        <MapChart 
          onFeatureSelect={handleFeatureSelect} 
          selectedFeature={selectedFeature} 
        />
      </div>
      {/* Passiamo la feature selezionata e l'handler di reset al pannello */}
      <InfoPanel 
        selectedFeature={selectedFeature} 
        onReset={handleFeatureSelect} // Passiamo la funzione per resettare (impostando a null)
      />
    </div>
  );
};

export default Home;