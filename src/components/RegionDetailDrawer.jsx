import React, { useState, useEffect } from "react";
import "./RegionDetailDrawer.css";
import { FaQuestionCircle } from 'react-icons/fa';

const KPITooltips = {
    affordability: "Misura l'accessibilità economica degli immobili rispetto al reddito familiare. Un valore alto indica una maggiore convenienza.",
    demandPressure: "Indica la pressione della domanda, basata sui tempi di vendita e altri fattori. Un valore alto suggerisce un mercato dinamico.",
    liquidity: "Rappresenta la facilità e velocità con cui un immobile può essere venduto. Un valore alto indica un mercato liquido e attivo.",
    momentum: "Misura il tasso di variazione dei prezzi immobiliari. Un valore alto indica una forte crescita dei prezzi nel periodo recente."
};

const getKpiStyle = (value) => {
    if (value === null || isNaN(value)) return { thumbClass: '', valueClass: '' };
    if (value > 70) return { thumbClass: 'thumb-green', valueClass: 'value-green' };
    if (value < 30) return { thumbClass: 'thumb-red', valueClass: 'value-red' };
    return { thumbClass: 'thumb-orange', valueClass: 'value-orange' };
};

const getKpiDescriptor = (value) => {
    if (value === null || isNaN(value)) return { text: 'Dato non disp.', className: 'value-muted' };
    if (value > 70) return { text: 'Elevato', className: 'value-green' };
    if (value > 30) return { text: 'Medio', className: 'value-orange' };
    return { text: 'Basso', className: 'value-red' };
};

const KpiIndicator = ({ title, value, tooltipText }) => {
    const [isTooltipVisible, setTooltipVisible] = useState(false);
    let hideTimeout;

    const handleMouseEnter = () => {
        clearTimeout(hideTimeout);
        setTooltipVisible(true);
    };

    const handleMouseLeave = () => {
        hideTimeout = setTimeout(() => setTooltipVisible(false), 300);
    };

    useEffect(() => {
        return () => clearTimeout(hideTimeout);
    }, [hideTimeout]);
    
    const style = getKpiStyle(value);
    const descriptor = getKpiDescriptor(value);
    const displayValue = value !== null ? value.toFixed(0) : 'N/D';

    return (
        <div className="indicator-wrapper">
            <div className="indicator-container">
                <div className="indicator-header">
                    <div className="indicator-title-group">
                        <span className="indicator-title">
                            {title}
                            <span
                                className="tooltip-trigger"
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                            >
                                <FaQuestionCircle />
                            </span>
                        </span>
                        <span className={`indicator-descriptor ${descriptor.className}`}>{descriptor.text}</span>
                    </div>
                    <span className={`indicator-value ${style.valueClass}`}>
                        {displayValue}
                    </span>
                </div>
                <div className="slider">
                    <div className="slider-track kpi-track"></div>
                    {value !== null && <div className={`slider-thumb ${style.thumbClass}`} style={{ left: `${value}%` }}></div>}
                </div>
                <div className="slider-labels">
                    <span>Basso</span>
                    <span>Alto</span>
                </div>
            </div>
            <div className={`indicator-tooltip ${isTooltipVisible ? 'visible' : ''}`}>
                {tooltipText}
            </div>
        </div>
    );
};

const RegionDetailDrawer = ({ regionData, onClose }) => {
    if (!regionData) {
        return null;
    }

    // regionData is expected to be the latest health data object for the region
    // e.g., { name: 'Lombardia', healthIndex: 0.8, variation: 0.05, kpis: {...} }
    const { kpis, name } = regionData;

    return (
        <div className="drawer">
            <div className="drawer-header">
                <h2>Indice di Salute: {name}</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>
            {kpis ? (
                <div className="drawer-content">
                    <KpiIndicator
                        title="Affordability"
                        value={kpis.affordability}
                        tooltipText={KPITooltips.affordability}
                    />
                    <KpiIndicator
                        title="Demand Pressure"
                        value={kpis.demandPressure}
                        tooltipText={KPITooltips.demandPressure}
                    />
                    <KpiIndicator
                        title="Market Liquidity"
                        value={kpis.liquidity}
                        tooltipText={KPITooltips.liquidity}
                    />
                    <KpiIndicator
                        title="Price Momentum"
                        value={kpis.momentum}
                        tooltipText={KPITooltips.momentum}
                    />
                </div>
            ) : (
                <div className="drawer-content-placeholder">
                    <p>Dati KPI non disponibili per questa regione.</p>
                </div>
            )}
        </div>
    );
};

export default RegionDetailDrawer;