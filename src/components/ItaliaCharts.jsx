// src/components/ItaliaCharts.jsx

import React, { useMemo, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler, SubTitle } from "chart.js";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import annotationPlugin from 'chartjs-plugin-annotation';
import HousingCycleChart from './HousingCycleChart';

ChartJS.register( CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, SubTitle, Tooltip, Legend, Filler, ChartDataLabels, annotationPlugin );

// Logica ciclo immobiliare (invariata)
const phaseDetails = { 0: { id: 0, name: "Indeterminata", shortName: "INDET.", color: "#9E9E9E" }, 1: { id: 1, name: "Espansione", shortName: "ESPANS.", color: "#C6FF00" }, 2: { id: 2, name: "Rallentamento", shortName: "RALL.", color: "#FFC107" }, 3: { id: 3, name: "Contrazione", shortName: "CONTR.", color: "#FF9800" }, 4: { id: 4, name: "Recessione", shortName: "RECESS.", color: "#F44336" }, 5: { id: 5, name: "Ripresa", shortName: "RIPRESA.", color: "#4CAF50" }, 6: { id: 6, "name": "Nuova Espansione", "shortName": "N.ESPANS.", color: "#8BC34A" } };
const T_THRESHOLDS = { STRONG_POS: 20.13, MILD_POS: 8.04, MILD_NEG: -7.47, STRONG_NEG: -13.35 };
const P_THRESHOLDS = { STRONG_POS: 1.26, MILD_POS: 0.20, MILD_NEG: -1.75, STRONG_NEG: -2.89 };
function determineHousingCyclePhase(currentEntry, previousEntry) { if (!currentEntry || !previousEntry || currentEntry.originalTransactions == null || currentEntry.priceVar == null) return phaseDetails[0]; const tPrev = previousEntry.originalTransactions; const tCurr = currentEntry.originalTransactions; const pCurr = currentEntry.priceVar; if (tPrev === 0) return tCurr > 0 ? phaseDetails[5] : phaseDetails[0]; const tChange = ((tCurr - tPrev) / tPrev) * 100; if (tChange >= T_THRESHOLDS.STRONG_POS && pCurr >= P_THRESHOLDS.STRONG_POS) return phaseDetails[6]; if (tChange >= T_THRESHOLDS.MILD_POS && pCurr >= P_THRESHOLDS.MILD_POS) return phaseDetails[1]; if (tChange < T_THRESHOLDS.MILD_POS && tChange > T_THRESHOLDS.STRONG_NEG && pCurr >= P_THRESHOLDS.MILD_POS) return phaseDetails[2]; if (tChange <= T_THRESHOLDS.MILD_NEG && pCurr <= P_THRESHOLDS.MILD_NEG) return phaseDetails[4]; if (tChange >= T_THRESHOLDS.MILD_POS && pCurr < P_THRESHOLDS.MILD_POS && pCurr > P_THRESHOLDS.STRONG_NEG) return phaseDetails[5]; if (tChange <= T_THRESHOLDS.MILD_NEG && pCurr >= P_THRESHOLDS.MILD_NEG && pCurr < P_THRESHOLDS.MILD_POS) return phaseDetails[3]; return phaseDetails[0]; }
function generateHistoricalPhaseBlocks(data) { if (data.length < 2) return []; const blocks = []; let activeBlock = null; for (let i = 1; i < data.length; i++) { const currentPhase = determineHousingCyclePhase(data[i], data[i - 1]); if (!activeBlock) { activeBlock = { startYear: data[i].year, endYear: data[i].year, phaseShortName: currentPhase.shortName, phaseColor: currentPhase.color, phaseId: currentPhase.id }; } else if (currentPhase.id !== activeBlock.phaseId) { blocks.push(activeBlock); activeBlock = { startYear: data[i].year, endYear: data[i].year, phaseShortName: currentPhase.shortName, phaseColor: currentPhase.color, phaseId: currentPhase.id }; } else { activeBlock.endYear = data[i].year; } } if (activeBlock) blocks.push(activeBlock); return blocks; }

// Stili comuni
const commonOptions = { maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'top', labels: { color: "#e0f7fa" }}, tooltip: { backgroundColor: "rgba(0,0,0,0.8)", titleColor: "#00e1ff", bodyColor: "#e0f7fa" }}, scales: { y: { ticks: { color: "#90a4ae" }, grid: { color: "rgba(255, 255, 255, 0.1)" }}, x: { ticks: { color: "#90a4ae", maxTicksLimit: 12 }, grid: { color: "rgba(255, 255, 255, 0.05)" }}}, };
const mainTabContainerStyle = { display: 'flex', marginBottom: '1rem', borderBottom: '2px solid rgba(255, 255, 255, 0.2)' };
const mainTabButtonStyle = (isActive) => ({ padding: '0.8rem 1.8rem', border: 'none', background: 'transparent', color: isActive ? '#00e1ff' : '#b0bec5', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem', borderBottom: isActive ? '4px solid #00e1ff' : '4px solid transparent', transition: 'all 0.2s ease-in-out', marginRight: '1rem', marginBottom: '-2px' });
const subTabContainerStyle = { display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', paddingLeft: '1rem' };
const subTabButtonStyle = (isActive) => ({ padding: '0.5rem 1rem', border: 'none', background: isActive ? 'rgba(0, 225, 255, 0.1)' : 'transparent', color: isActive ? '#00e1ff' : '#90a4ae', cursor: 'pointer', fontWeight: '500', borderBottom: isActive ? '2px solid #00e1ff' : '2px solid transparent', transition: 'all 0.2s ease-in-out', marginRight: '0.5rem', marginBottom: '-1px' });


// ===================================================================================
// COMPONENTE PER I GRAFICI MACROECONOMICI CON TAB INTERNE
// ===================================================================================
const MacroCharts = ({ data }) => {
    const [activeMacroTab, setActiveMacroTab] = useState('prices');
    if (!data || Object.keys(data).length < 5) return <div className="info-card" style={{ padding: '2rem', textAlign: 'center' }}><p>Dati macroeconomici non disponibili o incompleti.</p></div>;
    
    // Logica di aggregazione e calcolo dati (invariata)
    const aggregateDataByMonth = (dataset, dateKey, valueKey) => { if (!dataset) return []; const monthlyData = {}; for (const item of dataset) { const date = new Date(item[dateKey]); if (isNaN(date.getTime())) continue; const month = date.toISOString().slice(0, 7); if (!monthlyData[month]) { monthlyData[month] = { sum: 0, count: 0, date: `${month}-01` }; } monthlyData[month].sum += item[valueKey] || 0; monthlyData[month].count++; } return Object.values(monthlyData).map(({ date, sum, count }) => ({ Date: date, Value: count > 0 ? sum / count : 0 })); };
    const inflationChartData = useMemo(() => { if (!data.cpi || data.cpi.length < 13) return { labels: [], datasets: [] }; const sorted = [...data.cpi].sort((a, b) => new Date(a.Date) - new Date(b.Date)); const calculateYoY = (dataset, valueKey) => { const yoyData = []; for (let i = 12; i < dataset.length; i++) { const current = dataset[i][valueKey], previous = dataset[i - 12][valueKey]; yoyData.push(current && previous ? ((current / previous) - 1) * 100 : null); } return yoyData; }; return { labels: sorted.map(d => new Date(d.Date).toLocaleDateString('it-IT', { year: 'numeric', month: 'short' })).slice(12), datasets: [ { label: 'Italia', data: calculateYoY(sorted, 'Italy_HICP_2015base'), borderColor: '#4CAF50', tension: 0.3, pointRadius: 0 }, { label: 'Area Euro', data: calculateYoY(sorted, 'EuroArea_HICP_2015base'), borderColor: '#2196F3', tension: 0.3, pointRadius: 0 }, { label: 'USA', data: calculateYoY(sorted, 'USA_CPI_2015base'), borderColor: '#F44336', tension: 0.3, pointRadius: 0 }, ], }; }, [data.cpi]);
    const costOfMoneyChartData = useMemo(() => { if (!data.interbankRates || !data.bondYield10Y) return { labels: [], datasets: [] }; const allData = [...data.interbankRates, ...data.bondYield10Y]; const allMonths = [...new Set(allData.map(d => new Date(d.Date).toISOString().slice(0, 7)))].sort(); const bondMap = new Map(data.bondYield10Y.map(d => [new Date(d.Date).toISOString().slice(0, 7), d])); const interbankMap = new Map(data.interbankRates.map(d => [new Date(d.Date).toISOString().slice(0, 7), d])); return { labels: allMonths.map(m => new Date(m).toLocaleDateString('it-IT', { year: 'numeric', month: 'short' })), datasets: [ { label: 'BTP 10Y (Tassi Fissi ITA)', data: allMonths.map(m => bondMap.get(m)?.['BTP_10Y'] ?? null), borderColor: '#FF9800', tension: 0.3, pointRadius: 0 }, { label: 'Bund 10Y (Tassi Fissi UE)', data: allMonths.map(m => bondMap.get(m)?.['IRLTLT01DEM156N'] ?? null), borderColor: '#90a4ae', tension: 0.3, pointRadius: 0 }, { label: 'Euribor 3M (Tassi Variabili)', data: allMonths.map(m => interbankMap.get(m)?.['Euribor_3M'] ?? null), borderColor: '#00e1ff', tension: 0.3, pointRadius: 0 }, ], }; }, [data.interbankRates, data.bondYield10Y]);
    const gdpGrowthChartData = useMemo(() => { if (!data.gdpGrowth) return { labels: [], datasets: [] }; const countries = ['Italy', 'Germany', 'France', 'Spain'], colors = { 'Italy': '#4CAF50', 'Germany': '#2196F3', 'France': '#FFC107', 'Spain': '#F44336' }; const filtered = data.gdpGrowth.filter(d => countries.includes(d.Country)); const years = [...new Set(filtered.map(d => d.Year))].sort(); return { labels: years, datasets: countries.map(c => ({ label: c, data: years.map(y => filtered.find(d => d.Year === y && d.Country === c)?.GDP_Growth ?? null), backgroundColor: colors[c], })), }; }, [data.gdpGrowth]);
    const commoditiesChartData = useMemo(() => { const fuelData = aggregateDataByMonth(data.commoditiesIndex, 'Date', 'Fuel_Index'); const nonFuelData = aggregateDataByMonth(data.commoditiesIndex, 'Date', 'Non_Fuel_Index'); return { labels: fuelData.map(d => new Date(d.Date).toLocaleDateString('it-IT', { year: 'numeric', month: 'short' })), datasets: [ { label: 'Energia (Fuel)', data: fuelData.map(d => d.Value), borderColor: '#FF7043', fill: true, tension: 0.3, pointRadius: 0 }, { label: 'Non-Energia', data: nonFuelData.map(d => d.Value), borderColor: '#4DD0E1', fill: true, tension: 0.3, pointRadius: 0 }, ], }; }, [data.commoditiesIndex]);
    const energyCostChartData = useMemo(() => { const punData = aggregateDataByMonth(data.punPsv, 'Date', 'PUN euro/kWh'); const psvData = aggregateDataByMonth(data.punPsv, 'Date', 'PSV euro/Smc'); return { labels: punData.map(d => new Date(d.Date).toLocaleDateString('it-IT', { year: 'numeric', month: 'short' })), datasets: [ { label: 'Elettricità (PUN)', data: punData.map(d => d.Value), borderColor: '#00BFFF', yAxisID: 'yPun', pointRadius: 0 }, { label: 'Gas (PSV)', data: psvData.map(d => d.Value), borderColor: '#FF8C00', yAxisID: 'yPsv', pointRadius: 0 }, ], }; }, [data.punPsv]);
    
    const chartsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' };
    const chartContainerStyle = { height: '350px', padding: '1rem' };
    
    const charts = [
        { group: 'prices', question: "Perché le Banche Centrali hanno alzato i tassi?", title: "Tasso di Inflazione Annuo (YoY %)", Comp: Line, data: inflationChartData, specificOptions: { plugins: { annotation: { annotations: { targetLine: { type: 'line', yMin: 2, yMax: 2, borderColor: '#FFC107', borderWidth: 2, borderDash: [6, 6], label: { content: 'BCE Target 2%', enabled: true, position: 'end', backgroundColor: 'rgba(255, 193, 7, 0.7)' } } } } } } },
        { group: 'finance', question: "Quanto costa oggi finanziare un acquisto?", title: "Costo del Denaro", Comp: Line, data: costOfMoneyChartData, specificOptions: {} },
        { group: 'finance', question: "L'economia supporta il mercato immobiliare?", title: "Crescita Economica (PIL %)", Comp: Bar, data: gdpGrowthChartData, specificOptions: {} },
        { group: 'prices', question: "Da dove è partito lo shock inflazionistico?", title: "Andamento delle Materie Prime", Comp: Line, data: commoditiesChartData, specificOptions: {} },
        { group: 'prices', question: "Qual è stato l'impatto sulle bollette?", title: "Costo dell'Energia (PUN & PSV)", Comp: Line, data: energyCostChartData, specificOptions: { scales: { ...commonOptions.scales, yPun: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'PUN (€/kWh)', color: '#00BFFF' }, ticks: { color: '#00BFFF' } }, yPsv: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'PSV (€/Smc)', color: '#FF8C00' }, grid: { drawOnChartArea: false }, ticks: { color: '#FF8C00' } } } } },
    ];

    return (
        <div className="info-card">
            <div style={subTabContainerStyle}>
                <button style={subTabButtonStyle(activeMacroTab === 'prices')} onClick={() => setActiveMacroTab('prices')}>Prezzi e Costi</button>
                <button style={subTabButtonStyle(activeMacroTab === 'finance')} onClick={() => setActiveMacroTab('finance')}>Crescita e Tassi</button>
            </div>
            <div style={chartsGridStyle}>
                {charts.filter(c => c.group === activeMacroTab).map(({ question, title, Comp, data, specificOptions }, i) => (
                    // MODIFICA: Rimosso lo stile inline per coerenza con il tema principale.
                    <div key={i} className="info-card">
                        <div style={chartContainerStyle}>
                            <Comp data={data} options={{ ...commonOptions, ...specificOptions,
                                    plugins: { ...commonOptions.plugins, ...specificOptions.plugins,
                                        title: { display: true, text: question, color: '#e0f7fa', font: { size: 16 }, padding: { top: 10, bottom: 5 } },
                                        subtitle: { display: true, text: title, color: '#b0bec5', font: { size: 12, style: 'italic' }, padding: { bottom: 10 } },
                                        datalabels: { display: false }
                                    }
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ===================================================================================
// COMPONENTE PER I GRAFICI DEL MERCATO IMMOBILIARE
// ===================================================================================
const ItaliaCharts = ({ italiaData, laggingModelData, allRegionalData, affordabilityData, macroData }) => {
  const [activeMainTab, setActiveMainTab] = useState('mercato');

  const MarketCharts = () => {
    const [activeIndicatorTab, setActiveIndicatorTab] = useState('leading');
    const [rankingMetric, setRankingMetric] = useState('price');
    const historicalPhaseBlocks = useMemo(() => generateHistoricalPhaseBlocks(italiaData), [italiaData]);
    const yoyChartData = useMemo(() => { if (italiaData.length < 2) return { labels: [], datasets: [] }; const yoyData = []; for (let i = 1; i < italiaData.length; i++) { const prev = italiaData[i - 1].originalTransactions; const curr = italiaData[i].originalTransactions; yoyData.push(prev === 0 ? 0 : ((curr - prev) / prev) * 100); } return { labels: italiaData.map(d => d.year).slice(1), datasets: [{ label: 'Variazione % Anno su Anno', data: yoyData, borderColor: '#00e1ff', backgroundColor: 'rgba(0, 225, 255, 0.1)', fill: true }] }; }, [italiaData]);
    const doughnutChartData = useMemo(() => { const latest = italiaData.findLast(d => d.transactionsByMq); if (!latest || !latest.transactionsByMq) { return { labels: [], datasets: [] }; } const labels = ['Fino a 50 mq', '50-85 mq', '85-115 mq', '115-145 mq', 'Oltre 145 mq']; const realData = [latest.transactionsByMq['fino_a_50'], latest.transactionsByMq['_50_85'], latest.transactionsByMq['_85_115'], latest.transactionsByMq['_115_145'], latest.transactionsByMq['oltre_145']]; return { labels, datasets: [{ label: 'Ripartizione Mercato per Dimensione', data: realData, backgroundColor: ['#00e1ff', '#00b0d8', '#4caf50', '#ffa726', '#ef5350'], borderColor: '#37474f' }] }; }, [italiaData]);
    const filteredPredictiveData = useMemo(() => italiaData.filter(d => d.predictive?.impacts && d.predictive.marketIndexPredicted !== null), [italiaData]);
    const lineChartPredictiveData = useMemo(() => { const actualDataWithValues = filteredPredictiveData.map(d => d.predictive.marketIndexActual).filter(v => v !== null); const historicalAverage = actualDataWithValues.length > 0 ? actualDataWithValues.reduce((sum, value) => sum + value, 0) / actualDataWithValues.length : 0; return { labels: filteredPredictiveData.map(d => d.year), datasets: [{ label: 'Indice Mercato', data: filteredPredictiveData.map(d => d.predictive.marketIndexActual), borderColor: '#00e1ff', tension: 0.2 }, { label: 'Leading Indicator', data: filteredPredictiveData.map(d => d.predictive.marketIndexPredicted), borderColor: '#FFC107', tension: 0.2 }, { label: 'Equilibrio', data: Array(filteredPredictiveData.length).fill(historicalAverage), borderColor: '#9E9E9E', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0, fill: false }] }; }, [filteredPredictiveData]);
    
    // MODIFICA: L'hook ora restituisce anche l'anno per il titolo del grafico a barre.
    const { impactsBarData, impactsBarYear } = useMemo(() => {
        const defaultReturn = { impactsBarData: { labels: [], datasets: [] }, impactsBarYear: '' };
        const latestYearData = filteredPredictiveData.length > 0 ? filteredPredictiveData[filteredPredictiveData.length - 1] : null;
        if (!latestYearData?.predictive?.impacts) return defaultReturn;
        
        const { impacts } = latestYearData.predictive;
        const yearLabel = parseInt(latestYearData.year) + 1;
        const data = [impacts.confidence, impacts.spread, impacts.mortgages, impacts.residentialVar];
        const backgroundColors = data.map(value => value >= 0 ? '#4CAF50' : '#F44336');
        
        const chartData = {
            labels: ['Fiducia Cons.', 'Spread BTP-Bund', 'Nuovi Mutui', 'Var. Prezzi Abit.'],
            datasets: [{ label: `Impatti del ${yearLabel}`, data, backgroundColor: backgroundColors }]
        };
        return { impactsBarData: chartData, impactsBarYear: yearLabel.toString() };
    }, [filteredPredictiveData]);
    
    const lineChartLaggingData = useMemo(() => { if (!laggingModelData || laggingModelData.length === 0) return { labels: [], datasets: [] }; const actualDataWithValues = laggingModelData.map(d => d.marketIndexActual).filter(v => v !== null); const historicalAverage = actualDataWithValues.length > 0 ? actualDataWithValues.reduce((sum, value) => sum + value, 0) / actualDataWithValues.length : 0; return { labels: laggingModelData.map(d => d.year), datasets: [{ label: 'Indice Mercato', data: laggingModelData.map(d => d.marketIndexActual), borderColor: '#00e1ff', tension: 0.2 }, { label: 'Lagging Indicator', data: laggingModelData.map(d => d.marketIndexPredicted), borderColor: '#8BC34A', tension: 0.2 }, { label: 'Equilibrio', data: Array(laggingModelData.length).fill(historicalAverage), borderColor: '#9E9E9E', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0, fill: false }] }; }, [laggingModelData]);
    
    // MODIFICA: L'hook ora restituisce anche l'anno per il titolo del grafico a barre.
    const { impactsLaggingBarData, impactsLaggingBarYear } = useMemo(() => {
        const defaultReturn = { impactsLaggingBarData: { labels: [], datasets: [] }, impactsLaggingBarYear: '' };
        if (!laggingModelData || laggingModelData.length === 0) return defaultReturn;

        const latestYearData = laggingModelData[laggingModelData.length - 1];
        if (!latestYearData?.impacts) return defaultReturn;

        const { impacts } = latestYearData;
        const data = [impacts.rent, impacts.constructionCost, impacts.defaultRate];
        const backgroundColors = data.map(value => value >= 0 ? '#4CAF50' : '#F44336');

        const chartData = {
            labels: ['Affitto Medio', 'Costi Costruzione', 'Tasso Default Mutui'],
            datasets: [{ label: `Impatti del ${latestYearData.year}`, data, backgroundColor: backgroundColors }]
        };
        return { impactsLaggingBarData: chartData, impactsLaggingBarYear: latestYearData.year };
    }, [laggingModelData]);
    
    const regionalRankingData = useMemo(() => { if (!allRegionalData || Object.keys(allRegionalData).length === 0) return { labels: [], datasets: [] }; const metricKey = rankingMetric === 'price' ? 'averagePrice' : 'originalTransactions'; const latestData = Object.entries(allRegionalData).map(([regionName, data]) => { if (!data || data.length === 0 || regionName === 'ITALIA') return null; const latestYearData = data[data.length - 1]; return { region: regionName.charAt(0) + regionName.slice(1).toLowerCase(), value: latestYearData[metricKey] || 0 }; }).filter(Boolean).sort((a, b) => b.value - a.value).slice(0, 10); return { labels: latestData.map(d => d.region), datasets: [{ label: rankingMetric === 'price' ? 'Prezzo / m²' : 'N. Transazioni', data: latestData.map(d => d.value), backgroundColor: '#00b0d8' }] }; }, [allRegionalData, rankingMetric]);
    const sustainabilityChartData = useMemo(() => { if (!affordabilityData || affordabilityData.length === 0) return { labels: [], datasets: [] }; const sortedData = [...affordabilityData].sort((a, b) => a.year.localeCompare(b.year)); return { labels: sortedData.map(d => d.year), datasets: [{ label: 'Indice Sostenibilità (20A)', data: sortedData.map(d => d.sustainability20), borderColor: '#FF7043', backgroundColor: 'rgba(255, 112, 67, 0.2)', fill: true, tension: 0.2 }] }; }, [affordabilityData]);
    
    const chartsGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' };
    const doughnutOptions = { responsive: true, maintainAspectRatio: false, plugins: { ...commonOptions.plugins, title: { display: true, text: "Quali sono le metrature più scambiate?", color: '#e0f7fa' }, tooltip: { callbacks: { label: c => `${c.label}: ${((c.raw/c.chart.getDatasetMeta(0).total)*100).toFixed(1)}%`}}, datalabels: { formatter: (v,c) => {const p=(v/c.chart.getDatasetMeta(0).total)*100; return p<5 ? null : p.toFixed(0)+'%'}, color: '#1a2327', font: {weight:'bold', size:12}}}, scales: {x:{display:false}, y:{display:false}} };

    return (
      <>
        <div className="info-card"><h3 style={{color: '#e0f7fa', fontFamily: "'Roboto', sans-serif", fontSize: '16px', fontWeight: '500', paddingLeft: '1rem'}}>Andamento Storico del Ciclo Immobiliare Nazionale</h3><HousingCycleChart data={italiaData} phaseBlocks={historicalPhaseBlocks} /></div>
        <div style={chartsGridStyle}>
          <div className="info-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div style={subTabContainerStyle}><button style={subTabButtonStyle(activeIndicatorTab === 'leading')} onClick={() => setActiveIndicatorTab('leading')}>Analisi Predittiva</button><button style={subTabButtonStyle(activeIndicatorTab === 'lagging')} onClick={() => setActiveIndicatorTab('lagging')}>Analisi Descrittiva</button></div>
            {activeIndicatorTab === 'leading' ? (
                <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
                    <div style={{flex: '1 1 300px', minHeight: '300px'}}>
                        <Line options={{...commonOptions, plugins: {...commonOptions.plugins, datalabels: {display: false}, title: {display: true, text: 'Dove sta andando il mercato?', color: '#e0f7fa'}}}} data={lineChartPredictiveData} />
                    </div>
                    <div style={{flex: '0 0 180px', minHeight: '180px', marginTop: '1rem'}}>
                        {/* MODIFICA: Utilizza la variabile impactsBarYear per il titolo. */}
                        <Bar options={{...commonOptions, indexAxis: 'y', plugins: {...commonOptions.plugins, datalabels: {display: false}, legend: {display: false}, title: {display: true, text: `Quali fattori guidano la stima per ${impactsBarYear || '...'}?`, color: '#e0f7fa'}}, scales: {...commonOptions.scales, y: {...commonOptions.scales.y, grid: {display: false}}}}} data={impactsBarData}/>
                    </div>
                </div>
            ) : (
                <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
                    <div style={{flex: '1 1 300px', minHeight: '300px'}}>
                        <Line options={{...commonOptions, plugins: {...commonOptions.plugins, datalabels: {display: false}, title: {display: true, text: 'Cosa ha guidato il mercato finora?', color: '#e0f7fa'}}}} data={lineChartLaggingData}/>
                    </div>
                    <div style={{flex: '0 0 180px', minHeight: '180px', marginTop: '1rem'}}>
                        {/* MODIFICA: Utilizza la variabile impactsLaggingBarYear per il titolo. */}
                        <Bar options={{...commonOptions, indexAxis: 'y', plugins: {...commonOptions.plugins, datalabels: {display: false}, legend: {display: false}, title: {display: true, text: `Quali fattori hanno impattato nel ${impactsLaggingBarYear || '...'}?`, color: '#e0f7fa'}}, scales: {...commonOptions.scales, y: {...commonOptions.scales.y, grid: {display: false}}}}} data={impactsLaggingBarData}/>
                    </div>
                </div>
            )}
          </div>
          <div className="info-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div style={subTabContainerStyle}><button style={subTabButtonStyle(rankingMetric === 'price')} onClick={() => setRankingMetric('price')}>Prezzo / m²</button><button style={subTabButtonStyle(rankingMetric === 'transactions')} onClick={() => setRankingMetric('transactions')}>Transazioni</button><button style={subTabButtonStyle(rankingMetric === 'sustainability')} onClick={() => setRankingMetric('sustainability')}>Sostenibilità</button></div>
            <div style={{ flexGrow: 1, minHeight: '400px' }}>{rankingMetric === 'sustainability' ? <Line options={{...commonOptions, plugins: {...commonOptions.plugins, legend: {display: false}, title: {display: true, text: "È un buon momento per comprare casa?", color: '#e0f7fa'}, datalabels: {display: false}}}} data={sustainabilityChartData} /> : <Bar options={{...commonOptions, indexAxis: 'y', plugins: {...commonOptions.plugins, datalabels: {display: false}, legend: {display: false}, title: {display: true, text: rankingMetric === 'price' ? 'Quali sono le regioni con i prezzi più alti?' : 'Quali sono le regioni con più compravendite?', color: '#e0f7fa'}}, scales: {...commonOptions.scales, x: {...commonOptions.scales.x, ticks: {callback: (v) => rankingMetric === 'price' ? new Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR', maximumFractionDigits:0}).format(v) : new Intl.NumberFormat('it-IT').format(v)}}, y: {...commonOptions.scales.y, grid: {display: false}}}}} data={regionalRankingData} />}</div>
          </div>
          <div className="info-card"><div style={{ height: '350px', padding: '1rem' }}><Doughnut options={doughnutOptions} data={doughnutChartData}/></div></div>
          <div className="info-card"><div style={{ height: '350px', padding: '1rem' }}><Line options={{...commonOptions, plugins: {...commonOptions.plugins, datalabels: { display: false }, title: {display: true, text: 'Come sta variando il volume delle compravendite?', color: '#e0f7fa'}}, scales: {...commonOptions.scales, y: {...commonOptions.scales.y, ticks: {callback: v => `${v ? v.toFixed(1) : '0'}%`}}}}} data={yoyChartData} /></div></div>
        </div>
      </>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={mainTabContainerStyle}>
        <button style={mainTabButtonStyle(activeMainTab === 'mercato')} onClick={() => setActiveMainTab('mercato')}>Analisi Mercato Immobiliare</button>
        <button style={mainTabButtonStyle(activeMainTab === 'macro')} onClick={() => setActiveMainTab('macro')}>Contesto Macroeconomico</button>
      </div>
      {activeMainTab === 'mercato' && <MarketCharts />}
      {activeMainTab === 'macro' && <MacroCharts data={macroData} />}
    </div>
  );
};

export default ItaliaCharts;