// src/components/MetricSelector.jsx
import React from 'react';
import './MetricSelector.css';

const METRIC_OPTIONS = {
  '': 'Nessun Filtro',
  'transactions': 'Numero Transazioni (in migliaia)',
  'averagePrice': 'Prezzo Medio (€/m²)',
};

const YEAR_OPTIONS = Array.from({ length: 14 }, (_, i) => `${2011 + i}`).reverse(); // 2024, 2023, ... 2011

const MetricSelector = ({ selectedMetric, onMetricChange, selectedYear, onYearChange }) => {
  return (
    <div className="metric-selector-container">
      <div className="selector-group">
        <label htmlFor="metric-select">Metrica:</label>
        <select
          id="metric-select"
          value={selectedMetric}
          onChange={(e) => onMetricChange(e.target.value)}
        >
          {Object.entries(METRIC_OPTIONS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="selector-group">
        <label htmlFor="year-select">Anno:</label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
          disabled={!selectedMetric} // Disabilita se non c'è una metrica selezionata
        >
          {YEAR_OPTIONS.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default MetricSelector;