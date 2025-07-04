import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  Pane,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Legend from './Legend.jsx';
import './MapChart.css';
import { useGeoJSON } from '../hooks/useGeoJSON';
import { useChoroplethData } from '../hooks/useChoroplethData.js';
import { useActiveLayers } from '../hooks/useActiveLayers.js';
import { GEO_PROPERTIES } from '../config';

// Import per la logica Choropleth
import MetricSelector from './MetricSelector.jsx';
import { normalizeRegionName } from '../utils/dataUtils';
import {
  calculatePercentageChanges,
  getMinMaxForVariation,
  getColorForValue,
} from '../utils/mapUtils';

/* ========================================================================== */
/*                               CONFIGURAZIONE                               */
/* ========================================================================== */

// --- Configurazione Mappa ---
const INITIAL_MAP_CENTER = [42.5, 12.5];
const INITIAL_MAP_ZOOM = 6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 16;
const MAP_FLY_DURATION = 0.9;
const MAP_BOUNDS_PADDING = 40;

// --- Correzione Nomi Regioni ---
const REGION_NAME_MAPPING = {
  'TRENTINO-ALTO ADIGE/SÜDTIROL': 'TRENTINO ALTO ADIGE',
  "VALLE D'AOSTA/VALLÉE D'AOSTE": "VALLE D'AOSTA",
};

// --- ✨ MODIFICATO: Configurazione Colori Metriche ---
const COLOR_BAD  = [219, 68, 55];    // Rosso per variazioni negative (invariato)
const COLOR_GOOD = [76, 175, 80];    // Verde per variazioni positive (era blu)

// --- MODIFICATO: Etichette e logica dei colori per le variazioni percentuali ---
const METRIC_COLORS = {
  averagePrice: {
    label: 'Variazione % Prezzo Medio',
    start: COLOR_BAD,  // Calo del prezzo -> Rosso (considerato negativo per il mercato)
    end:   COLOR_GOOD, // Aumento del prezzo -> Verde (considerato positivo per il mercato)
  },
  transactions: {
    label: 'Variazione % N. Transazioni',
    start: COLOR_BAD,  // Meno transazioni (negativo) -> Rosso
    end:   COLOR_GOOD, // Più transazioni (positivo) -> Verde
  },
};

// --- Stili Originali per Interazione ---
const STYLES = {
  region: {
    default:   { fillColor: '#3949ab', color: '#aab6fe', weight: 1.5, fillOpacity: 0.6 },
    hover:     { weight: 2.5, color: '#ffc107', fillOpacity: 0.7 },
    container: { fill: true, fillColor: '#ffc107', fillOpacity: 0.2, color: '#ffffff', weight: 2, dashArray: '5, 5' },
  },
  province: {
    default:   { fill: true, color: '#ffffff', weight: 1.5, fillOpacity: 0 },
    hover:     { weight: 2.5, color: '#ffeb3b', fill: true, fillOpacity: 0.2 },
    container: { fill: true, fillColor: '#ffffff', fillOpacity: 0.2, color: '#ffeb3b', weight: 2, dashArray: '5, 5' },
    selected:  { weight: 2.5, color: '#ffeb3b', fill: true, fillOpacity: 0.05 },
  },
  comune: {
    default:   { fill: true, color: '#ffffff', weight: 0.7, opacity: 0.8, fillOpacity: 0 },
    hover:     { weight: 2, color: '#ffeb3b', opacity: 1, fill: true, fillOpacity: 0.2 },
    selected:  { fill: true, fillColor: '#ffeb3b', fillOpacity: 0.5, color: '#ffc107', weight: 2.5, dashArray: '' },
  },
};

/* ========================================================================== */
/*                         HELPER INTERNI AL COMPONENTE                       */
/* ========================================================================== */

const MapController = ({ view }) => {
  const map = useMap();
  useEffect(() => {
    if (!view) return;
    if (view.center && view.zoom !== undefined) map.flyTo(view.center, view.zoom, { duration: MAP_FLY_DURATION });
    else if (view.bounds) map.flyToBounds(view.bounds, { padding: [MAP_BOUNDS_PADDING, MAP_BOUNDS_PADDING], duration: MAP_FLY_DURATION });
  }, [view, map]);
  return null;
};

const getTargetViewForFeature = (featureLayerOrGeoJson, mapInstance, zoomIncrement = 1) => {
  if (!mapInstance) return { center: null, zoom: null, bounds: null };
  const bounds = featureLayerOrGeoJson.getBounds ? featureLayerOrGeoJson.getBounds() : L.geoJSON(featureLayerOrGeoJson).getBounds();
  if (!bounds.isValid()) return { center: null, zoom: null, bounds: null };
  const baseZoom = mapInstance.getBoundsZoom(bounds, false);
  const targetZoom = Math.min(mapInstance.getMaxZoom(), baseZoom + zoomIncrement);
  return { center: bounds.getCenter(), zoom: targetZoom, bounds };
};

/* ========================================================================== */
/*                             COMPONENTE MAPCHART                            */
/* ========================================================================== */
const MapChart = ({ onFeatureSelect, selectedFeature, regionalData, drawerRegion }) => {
  /* ---------------------- CARICAMENTO DATI GEOJSON ---------------------- */
  const { data: jsonRegioni, loading: l1, error: e1 } = useGeoJSON('/data/regioni.json');
  const { data: jsonProvincie, loading: l2, error: e2 } = useGeoJSON('/data/provincie.json');
  const { data: jsonComuni, loading: l3, error: e3 } = useGeoJSON('/data/comuni.json');

  /* ---------------------- STATE E REF ---------------------- */
  const [mapView, setMapView] = useState(null);
  const mapRef = useRef(null);
  const refs = { regioni: useRef(null), province: useRef(null), comuni: useRef(null) };
  const [hoveredFeature, setHoveredFeature] = useState({ region: null, province: null, comune: null });
  const [selectedMetric, setSelectedMetric] = useState('averagePrice');

  /* ---------------------- DATI DERIVATI (HOOKS) ---------------------- */
  const allYears = useMemo(() => {
    if (!regionalData) return [];
    const italiaData = regionalData['ITALIA'] || Object.values(regionalData)[0];
    return italiaData ? [...new Set(italiaData.map(d => d.year))].sort((a, b) => b.localeCompare(a)) : [];
  }, [regionalData]);
  
  const availableYears = useMemo(() => allYears.slice(0, -1), [allYears]);
  const [selectedYear, setSelectedYear] = useState(availableYears[0] || '');

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const { regionalVariations, colorScale } = useChoroplethData(regionalData, selectedMetric, selectedYear);
  const { activeRegion, activeProvince, activeComune, visibleProvinces, visibleComuni } = useActiveLayers(selectedFeature, jsonRegioni, jsonProvincie, jsonComuni);
  
  /* ---------------------- GESTORI DI EVENTI ---------------------- */
  const handleRegionClick = useCallback((e, feature) => {
    L.DomEvent.stopPropagation(e);
    setHoveredFeature({ region: null, province: null, comune: null });
    onFeatureSelect(feature.properties);
    if (mapRef.current) {
      const { center, zoom } = getTargetViewForFeature(e.target, mapRef.current);
      if (center && zoom !== null) setMapView({ center, zoom });
    }
  }, [onFeatureSelect]);

  const handleProvinceClick = useCallback((e, feature) => {
    L.DomEvent.stopPropagation(e);
    setHoveredFeature(prev => ({ ...prev, province: null, comune: null }));
    onFeatureSelect(feature.properties);
    if (mapRef.current) {
      const { center, zoom } = getTargetViewForFeature(e.target, mapRef.current);
      if (center && zoom !== null) setMapView({ center, zoom });
    }
  }, [onFeatureSelect]);

  const handleComuneClick = useCallback((e, feature) => {
    L.DomEvent.stopPropagation(e);
    setHoveredFeature(prev => ({ ...prev, comune: null }));
    onFeatureSelect(feature.properties);
  }, [onFeatureSelect]);

  const goBackToNational = useCallback(e => {
    L.DomEvent.stopPropagation(e);
    onFeatureSelect(null);
  }, [onFeatureSelect]);

  const goBackToRegion = useCallback(e => {
    L.DomEvent.stopPropagation(e);
    if (!activeRegion) return;
    const bounds = L.geoJSON(activeRegion.feature).getBounds();
    if (bounds.isValid()) setMapView({ bounds });
    onFeatureSelect({
      [GEO_PROPERTIES.REGION_CODE]: activeRegion.feature.properties[GEO_PROPERTIES.REGION_NAME],
      [GEO_PROPERTIES.REGION_NAME]: activeRegion.feature.properties[GEO_PROPERTIES.REGION_NAME]
    });
  }, [onFeatureSelect, activeRegion]);

  const goBackToProvince = useCallback(e => {
    L.DomEvent.stopPropagation(e);
    if (!activeProvince || !mapRef.current) return;
    const { center, zoom } = getTargetViewForFeature(activeProvince.feature, mapRef.current);
    if (center && zoom !== null) setMapView({ center, zoom });
    onFeatureSelect(activeProvince.feature.properties);
  }, [onFeatureSelect, activeProvince]);

  /* ---------------------- LOGICA DI STILE DINAMICO ---------------------- */
  const getRegionStyle = useCallback(feature => {
    const code = feature.properties[GEO_PROPERTIES.REGION_CODE];
    const name = feature.properties[GEO_PROPERTIES.REGION_NAME];
    
    if (activeRegion?.code !== code && hoveredFeature.region === code) {
      return STYLES.region.hover;
    }
    
    if (regionalVariations && colorScale) {
      const normalizedGeoJsonName = normalizeRegionName(name);
      const dataKey = REGION_NAME_MAPPING[normalizedGeoJsonName] || normalizedGeoJsonName;
      const value = regionalVariations[dataKey];

      if (typeof value === 'number' && !isNaN(value)) {
        const colorConfig = METRIC_COLORS[selectedMetric];
        const fillColor = getColorForValue(value, colorScale.min, colorScale.max, colorConfig.start, colorConfig.end);
        return { ...STYLES.region.default, fillColor, fillOpacity: 0.85 };
      }
      
      return { ...STYLES.region.default, fillColor: '#555', fillOpacity: 0.5, color: '#888' };
    }
    return STYLES.region.default;
  }, [activeRegion, hoveredFeature.region, selectedMetric, regionalVariations, colorScale]);
  
  const getProvinceStyle = useCallback((feature) => {
    const code = feature.properties[GEO_PROPERTIES.PROVINCE_CODE];
    if (activeProvince?.code === code) return STYLES.province.selected;
    if (hoveredFeature.province === code) return STYLES.province.hover;
    return STYLES.province.default;
  }, [activeProvince, hoveredFeature.province]);

  const getComuneStyle = useCallback((feature) => {
    const code = feature.properties[GEO_PROPERTIES.COMUNE_CODE];
    if (activeComune?.code === code) return STYLES.comune.selected;
    if (hoveredFeature.comune === code) return STYLES.comune.hover;
    return STYLES.comune.default;
  }, [activeComune, hoveredFeature.comune]);

  /* ---------------------- HANDLER PER LAYER ---------------------- */
  const onEachRegionFeature = useCallback((feature, layer) => {
    const code = feature.properties[GEO_PROPERTIES.REGION_CODE];
    layer.on({
      mouseover: (e) => { if (activeRegion?.code !== code) { setHoveredFeature(prev => ({ ...prev, region: code })); e.target.bringToFront(); } },
      mouseout: () => setHoveredFeature(prev => ({ ...prev, region: null })),
      click: e => handleRegionClick(e, feature),
    });
    layer.bindTooltip(feature.properties[GEO_PROPERTIES.REGION_NAME], { sticky: true, className: 'region-tooltip' });
  }, [activeRegion, handleRegionClick]);

  const onEachProvinceFeature = useCallback((feature, layer) => {
    const code = feature.properties[GEO_PROPERTIES.PROVINCE_CODE];
    layer.on({
      mouseover: (e) => { if (activeProvince?.code !== code) { setHoveredFeature(prev => ({ ...prev, province: code })); e.target.bringToFront(); } },
      mouseout: () => setHoveredFeature(prev => ({ ...prev, province: null })),
      click: e => handleProvinceClick(e, feature),
    });
    layer.bindTooltip(`${feature.properties[GEO_PROPERTIES.PROVINCE_NAME]} (${feature.properties[GEO_PROPERTIES.PROVINCE_SIGLA]})`, { sticky: true, className: 'region-tooltip' });
  }, [activeProvince, handleProvinceClick]);

  const onEachComuneFeature = useCallback((feature, layer) => {
    const code = feature.properties[GEO_PROPERTIES.COMUNE_CODE];
    layer.on({
      mouseover: (e) => { if (activeComune?.code !== code) { setHoveredFeature(prev => ({ ...prev, comune: code })); } },
      mouseout: () => setHoveredFeature(prev => ({ ...prev, comune: null })),
      click: e => handleComuneClick(e, feature),
    });
    layer.bindTooltip(feature.properties[GEO_PROPERTIES.COMUNE_NAME], { sticky: true, className: 'region-tooltip' });
    if (activeComune?.code === code) layer.bringToFront();
  }, [activeComune, handleComuneClick]);
  
  /* ---------------------- EFFETTI SECONDARI ---------------------- */
  useEffect(() => {
    if (!selectedFeature) {
      setMapView({ center: INITIAL_MAP_CENTER, zoom: INITIAL_MAP_ZOOM });
    }
  }, [selectedFeature]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        
        const featureToFocusOn = activeComune?.feature || activeProvince?.feature || activeRegion?.feature;
        
        if (featureToFocusOn) {
          const bounds = L.geoJSON(featureToFocusOn).getBounds();
          if (bounds.isValid()) {
            setMapView({ bounds });
          }
        }
      }
    }, 350); 
    return () => clearTimeout(timer);
  }, [drawerRegion, activeRegion, activeProvince, activeComune]);

  /* ---------------------- GESTIONE LOADING ED ERRORI ---------------------- */
  if (l1 || l2 || l3) return <div className="map-placeholder">Caricamento mappa…</div>;
  if (e1 || e2 || e3) return <div className="map-placeholder">Errore caricamento dati geografici</div>;
  if (!jsonRegioni || !jsonProvincie || !jsonComuni) return <div className="map-placeholder">Dati geografici non disponibili.</div>;

  const provinceLayerKey = activeRegion ? `province-${activeRegion.code}` : 'provinces-layer';
  const comuneLayerKey = activeProvince ? `comuni-${activeProvince.code}` : 'comuni-layer';

  /* ---------------------- RENDER DEL COMPONENTE ---------------------- */
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MetricSelector 
        selectedMetric={selectedMetric} 
        onMetricChange={setSelectedMetric} 
        selectedYear={selectedYear} 
        onYearChange={setSelectedYear} 
        availableYears={availableYears} 
      />
      <MapContainer 
        center={INITIAL_MAP_CENTER} 
        zoom={INITIAL_MAP_ZOOM} 
        minZoom={MIN_ZOOM} 
        maxZoom={MAX_ZOOM} 
        style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-dark)' }} 
        whenReady={(mapInstanceEvent) => { mapRef.current = mapInstanceEvent.target; }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" attribution="CARTO & OSM" />
        <MapController view={mapView} />
        <Pane name="containerPane" style={{ zIndex: 610 }} />
        <Pane name="featuresPane"  style={{ zIndex: 620 }} />
        
        <GeoJSON 
          key={`regioni-layer-${selectedMetric}-${selectedYear}`} 
          ref={refs.regioni} 
          data={jsonRegioni.features} 
          style={getRegionStyle} 
          onEachFeature={onEachRegionFeature} 
        />
        
        {activeRegion && ( 
          <GeoJSON 
            key={`region-container-${activeRegion.code}`} 
            data={activeRegion.feature} 
            style={STYLES.region.container} 
            eventHandlers={{ click: goBackToNational }} 
            pane="containerPane" 
            interactive={false} 
          /> 
        )}
        
        {activeRegion && visibleProvinces && ( 
          <GeoJSON 
            key={provinceLayerKey} 
            ref={refs.province} 
            data={visibleProvinces.features} 
            style={getProvinceStyle} 
            pane="featuresPane" 
            onEachFeature={onEachProvinceFeature} 
          /> 
        )}

        {activeProvince && ( 
          <GeoJSON 
            key={`province-container-${activeProvince.code}`} 
            data={activeProvince.feature} 
            style={STYLES.province.container} 
            eventHandlers={{ click: activeComune ? goBackToProvince : goBackToRegion }} 
            pane="containerPane" 
          /> 
        )}

        {activeProvince && visibleComuni && ( 
          <GeoJSON 
            key={comuneLayerKey} 
            ref={refs.comuni} 
            data={visibleComuni.features} 
            style={getComuneStyle} 
            pane="featuresPane" 
            onEachFeature={onEachComuneFeature} 
          /> 
        )}
        
        <Legend metric={selectedMetric ? METRIC_COLORS[selectedMetric] : null} scale={colorScale} />
      </MapContainer>
    </div>
  );
};

export default React.memo(MapChart);