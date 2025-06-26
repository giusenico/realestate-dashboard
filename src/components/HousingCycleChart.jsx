// src/components/HousingCycleChart.js
import React from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceArea, Label
} from 'recharts';

// 🎨 TEMA ISPIRATO ALL'IMMAGINE FORNITA
const themeColors = {
  background: '#1F2937',      // Sfondo scuro del grafico
  transactionsBar: '#FF5277', // Rosa-corallo per le barre
  priceLine: '#00E1FF',        // Ciano acceso per la linea
  grid: 'rgba(255, 255, 255, 0.1)',
  textPrimary: '#EAECEF',
  textSecondary: '#A0AEC0'
};

const hexToRgba = (hex, alpha) => {
  if (!hex || typeof hex !== 'string' || hex.length < 4) return `rgba(128, 128, 128, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="recharts-default-tooltip">
        <p className="recharts-tooltip-label">{`Anno: ${label}`}</p>
        <ul className="recharts-tooltip-item-list" style={{paddingLeft: 0, listStyle: 'none'}}>
          {payload.map((entry, index) => (
            <li key={`item-${index}`} style={{ color: entry.color, padding: '3px 0' }}>
              {`${entry.name}: `}
              <strong>
                {entry.dataKey === 'transactions' 
                  ? `${Number(entry.value * 1000).toLocaleString('it-IT')}` 
                  : `${Number(entry.value).toFixed(1)}%`}
              </strong>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
};

const HousingCycleChart = ({ data, phaseBlocks }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder" style={{ height: 350 }}>
        <p>Dati insufficienti per il grafico.</p>
      </div>
    );
  }

  // Calcolo dominio per l'asse Y delle transazioni per un migliore padding
  const transactionValues = data.map(d => d.transactions);
  const maxTransaction = Math.max(...transactionValues);
  const yDomainLeft = [0, Math.ceil(maxTransaction * 1.1)]; // 10% di padding in alto

  return (
    <div style={{ height: 350, width: '100%', backgroundColor: themeColors.background, borderRadius: 'var(--border-radius-lg)', padding: '10px 0' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 50, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid stroke={themeColors.grid} strokeDasharray="3 3" vertical={false} />

          <XAxis 
            dataKey="year" 
            tick={{ fontSize: 11, fill: themeColors.textSecondary }} 
            axisLine={false} 
            tickLine={false} 
            interval="preserveStartEnd" 
          />
          
          <YAxis 
            yAxisId="left" 
            orientation="left" 
            tick={{ fontSize: 10, fill: themeColors.textSecondary }} 
            tickFormatter={v => `${Math.round(v / 1000)}k`} 
            label={{ value: "Transazioni", angle: -90, position: 'insideLeft', fill: themeColors.textSecondary, fontSize: 11, dy: 60, dx: 0 }} 
            axisLine={false} 
            tickLine={false}
            domain={yDomainLeft}
            width={45}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fontSize: 10, fill: themeColors.textSecondary }} 
            tickFormatter={v => `${v.toFixed(0)}%`} 
            label={{ value: 'Var. Prezzi %', angle: 90, position: 'insideRight', fill: themeColors.textSecondary, fontSize: 11, dy: 50, dx: -5 }} 
            axisLine={false} 
            tickLine={false}
            width={45}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
          
          <Legend 
            verticalAlign="top" 
            align="left"
            wrapperStyle={{ top: 5, left: 20, fontSize: 12, color: themeColors.textSecondary }} 
            iconSize={12}
            payload={[
              { value: "N. Transazioni", type: 'square', id: 'transactions', color: themeColors.transactionsBar },
              { value: 'Var. Prezzi Reali (%)', type: 'line', id: 'priceVar', color: themeColors.priceLine }
            ]} 
          />

          {phaseBlocks && phaseBlocks.map((block, i) => (
            <ReferenceArea 
              key={i} 
              x1={block.startYear} 
              x2={block.endYear} 
              yAxisId="left" 
              fill={hexToRgba(block.phaseColor, 0.2)} 
              stroke={hexToRgba(block.phaseColor, 0.4)} 
              strokeOpacity={0.7} 
              ifOverflow="visible"
            >
              {/* Etichette delle fasi posizionate in alto, grandi e leggibili */}
              <Label 
                value={block.phaseShortName} 
                position="top" 
                offset={-35} // Spinge l'etichetta verso l'alto nel margine
                fill={block.phaseColor} 
                fontSize={10} 
                fontWeight="bold" 
              />
            </ReferenceArea>
          ))}
          
          <Bar 
            yAxisId="left" 
            dataKey="transactions" 
            name="N. Transazioni" 
            barSize={15} 
            fill={themeColors.transactionsBar} 
            radius={[3, 3, 0, 0]} 
          />
          
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="priceVar" 
            name="Var. Prezzi Reali (%)" 
            stroke={themeColors.priceLine} 
            strokeWidth={3} 
            connectNulls 
            dot={false} 
            activeDot={{ r: 6, strokeWidth: 2, fill: themeColors.priceLine, stroke: themeColors.textPrimary }} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HousingCycleChart;