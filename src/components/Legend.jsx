// src/components/Legend.jsx
import React from 'react';
import './Legend.css';

// Funzione helper per formattare i numeri in modo leggibile
const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(num);
};

const Legend = ({ metric, scale }) => {
  // Se non c'è metrica o scala, mostra un messaggio di default
  if (!metric || !scale || scale.max <= 0) {
    return (
      <div className="legend-container">
        <h4>Legenda</h4>
        <p className="legend-placeholder">Seleziona una metrica per colorare la mappa.</p>
      </div>
    );
  }

  // Crea il gradiente CSS basato sui colori della metrica
  const gradient = `linear-gradient(to right, rgb(${metric.start.join(',')}), rgb(${metric.end.join(',')}))`;

  return (
    <div className="legend-container">
      <h4>{metric.label}</h4>
      <div className="legend-scale">
        <div className="legend-gradient" style={{ background: gradient }}></div>
        <div className="legend-labels">
          <span>{formatNumber(scale.min)}</span>
          <span>{formatNumber(scale.max)}</span>
        </div>
      </div>
    </div>
  );
};

export default Legend;