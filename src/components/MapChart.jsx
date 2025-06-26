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
import { GEO_PROPERTIES } from '../config';

/* ---------------------------- CONFIGURAZIONE ---------------------------- */

const INITIAL_MAP_CENTER = [42.5, 12.5];
const INITIAL_MAP_ZOOM = 6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 16;
const MAP_FLY_DURATION = 1.2;
const MAP_BOUNDS_PADDING = 40;

/* ---------------------------- STILI ---------------------------- */
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



/* ---------------------- CONTROLLER ZOOM ---------------------- */
const MapController = ({ view }) => {
  const map = useMap();
  useEffect(() => {
    if (!view) return;
    if (view.center && view.zoom !== undefined) {
      map.flyTo(view.center, view.zoom, { duration: MAP_FLY_DURATION });
    } else if (view.bounds) {
      const pad = view.padding ?? MAP_BOUNDS_PADDING;
      map.flyToBounds(view.bounds, { padding: [pad, pad], duration: MAP_FLY_DURATION });
    }
  }, [view, map]);
  return null;
};

/* ------------------- HELPER PER ZOOM E CENTERING -------------------- */
const getTargetViewForFeature = (featureLayerOrGeoJson, mapInstance, zoomIncrement = 1) => {
  if (!mapInstance) return { center: null, zoom: null, bounds: null };
  
  const bounds = featureLayerOrGeoJson.getBounds 
    ? featureLayerOrGeoJson.getBounds() 
    : L.geoJSON(featureLayerOrGeoJson).getBounds();
  
  if (!bounds.isValid()) return { center: null, zoom: null, bounds: null };

  const baseZoom = mapInstance.getBoundsZoom(bounds, false);
  const targetZoom = Math.min(mapInstance.getMaxZoom(), baseZoom + zoomIncrement);
  return { center: bounds.getCenter(), zoom: targetZoom, bounds };
};


/* ============================================================= */
/*                           MAPCHART                            */
/* ============================================================= */
const MapChart = ({ onFeatureSelect, selectedFeature }) => {
  /* ---------------------- DATI ---------------------- */
  const { data: jsonRegioni,    loading: l1, error: e1 } = useGeoJSON('/data/regioni.json');
  const { data: jsonProvincie,  loading: l2, error: e2 } = useGeoJSON('/data/provincie.json');
  const { data: jsonComuni,     loading: l3, error: e3 } = useGeoJSON('/data/comuni.json');

  /* ---------------------- STATE / REF ---------------------- */
  const [mapView, setMapView] = useState(null);
  const mapRef = useRef(null); // Ref per l'istanza della mappa
  const refs = {
    regioni:  useRef(null),
    province: useRef(null),
    comuni:   useRef(null),
  };
  const [hoveredFeature, setHoveredFeature] = useState({ region: null, province: null, comune: null });

  /* ---------------------- FEATURE ATTIVE ---------------------- */
  const activeRegion = useMemo(() => {
    if (!selectedFeature?.[GEO_PROPERTIES.REGION_CODE] || !jsonRegioni) return null;
    const feat = jsonRegioni.features.find(f => f.properties[GEO_PROPERTIES.REGION_CODE] === selectedFeature[GEO_PROPERTIES.REGION_CODE]);
    return feat && { code: selectedFeature[GEO_PROPERTIES.REGION_CODE], feature: feat };
  }, [selectedFeature, jsonRegioni]);

  const activeProvince = useMemo(() => {
    if (!selectedFeature?.[GEO_PROPERTIES.PROVINCE_CODE] || !jsonProvincie) return null;
    const feat = jsonProvincie.features.find(f => f.properties[GEO_PROPERTIES.PROVINCE_CODE] === selectedFeature[GEO_PROPERTIES.PROVINCE_CODE]);
    return feat && { code: selectedFeature[GEO_PROPERTIES.PROVINCE_CODE], feature: feat };
  }, [selectedFeature, jsonProvincie]);

  const activeComune = useMemo(() => {
    if (!selectedFeature?.[GEO_PROPERTIES.COMUNE_CODE] || !jsonComuni) return null;
    const feat = jsonComuni.features.find(f => f.properties[GEO_PROPERTIES.COMUNE_CODE] === selectedFeature[GEO_PROPERTIES.COMUNE_CODE]);
    return feat && { code: selectedFeature[GEO_PROPERTIES.COMUNE_CODE], feature: feat };
  }, [selectedFeature, jsonComuni]);

  /* ---------------------- HANDLER CLICK ---------------------- */
  const handleRegionClick = useCallback((e, feature) => {
    L.DomEvent.stopPropagation(e);
    setHoveredFeature({ region: null, province: null, comune: null });
    onFeatureSelect(feature.properties);
    
    if (mapRef.current) {
      const { center, zoom } = getTargetViewForFeature(e.target, mapRef.current);
      if (center && zoom !== null) {
        setMapView({ center, zoom });
      }
    }
  }, [onFeatureSelect]);

  const handleProvinceClick = useCallback((e, feature) => {
    L.DomEvent.stopPropagation(e);
    setHoveredFeature(prev => ({ ...prev, province: null, comune: null }));
    onFeatureSelect(feature.properties);

    if (mapRef.current) {
      const { center, zoom } = getTargetViewForFeature(e.target, mapRef.current);
       if (center && zoom !== null) {
        setMapView({ center, zoom });
      }
    }
  }, [onFeatureSelect]);

  const handleComuneClick = useCallback((e, feature) => {
    L.DomEvent.stopPropagation(e);
    setHoveredFeature(prev => ({ ...prev, comune: null }));
    onFeatureSelect(feature.properties);
    // Potrebbe non essere necessario zoomare ulteriormente su un comune,
    // ma se lo fosse, la logica sarebbe simile a sopra.
  }, [onFeatureSelect]);

  /* ---------------------- NAVIGATION HANDLERS ---------------------- */
  const goBackToNational = useCallback(e => {
    L.DomEvent.stopPropagation(e);
    onFeatureSelect(null);
  }, [onFeatureSelect]);

  const goBackToRegion = useCallback(e => {
    L.DomEvent.stopPropagation(e);
    if (!activeRegion) return;
    const bounds = L.geoJSON(activeRegion.feature).getBounds();
    if (bounds.isValid()) {
        setMapView({ bounds });
    }
    // Seleziona solo le proprietà della regione
    onFeatureSelect({
        [GEO_PROPERTIES.REGION_CODE]: activeRegion.feature.properties[GEO_PROPERTIES.REGION_CODE],
        [GEO_PROPERTIES.REGION_NAME]: activeRegion.feature.properties[GEO_PROPERTIES.REGION_NAME],
    });
  }, [onFeatureSelect, activeRegion]);

  const goBackToProvince = useCallback(e => {
    L.DomEvent.stopPropagation(e);
    if (!activeProvince || !mapRef.current) return;
    
    const { center, zoom } = getTargetViewForFeature(activeProvince.feature, mapRef.current);
    if (center && zoom !== null) {
      setMapView({ center, zoom });
    }
    // Seleziona solo le proprietà della provincia (e quelle della regione parente se disponibili)
    onFeatureSelect(activeProvince.feature.properties);
  }, [onFeatureSelect, activeProvince]);

  /* ---------------------- RESET NAZIONALE ---------------------- */
  useEffect(() => {
    if (!selectedFeature) {
      setMapView({ center: INITIAL_MAP_CENTER, zoom: INITIAL_MAP_ZOOM });
    }
  }, [selectedFeature]);
  
  /* ---------------------- DATA SUBSET ---------------------- */
  const visibleProvinces = useMemo(() => {
    if (!activeRegion || !jsonProvincie) return null;
    return {
      ...jsonProvincie,
      features: jsonProvincie.features.filter(f => f.properties[GEO_PROPERTIES.REGION_CODE] === activeRegion.code)
    };
  }, [activeRegion, jsonProvincie]);

  const visibleComuni = useMemo(() => {
    if (!activeProvince || !jsonComuni) return null;
    return {
      ...jsonComuni,
      features: jsonComuni.features.filter(f => f.properties[GEO_PROPERTIES.PROVINCE_CODE] === activeProvince.code)
    };
  }, [activeProvince, jsonComuni]);

  /* ---------------------- STILI DINAMICI ---------------------- */
  const getRegionStyle = useCallback(feature => {
    const code = feature.properties[GEO_PROPERTIES.REGION_CODE];
    if (activeRegion?.code !== code && hoveredFeature.region === code) {
      return STYLES.region.hover;
    }
    return STYLES.region.default;
  }, [activeRegion, hoveredFeature.region]);

  const getProvinceStyle = useCallback(feature => {
    const code = feature.properties[GEO_PROPERTIES.PROVINCE_CODE];
    if (activeProvince?.code === code) {
      return STYLES.province.selected;
    }
    if (hoveredFeature.province === code) {
      return STYLES.province.hover;
    }
    return STYLES.province.default;
  }, [activeProvince, hoveredFeature.province]);

  const getComuneStyle = useCallback(feature => {
    const code = feature.properties[GEO_PROPERTIES.COMUNE_CODE];
    if (activeComune?.code === code) {
      return STYLES.comune.selected;
    }
    if (hoveredFeature.comune === code) {
      return STYLES.comune.hover;
    }
    return STYLES.comune.default;
  }, [activeComune, hoveredFeature.comune]);

  /* ---------------------- ON EACH FEATURE HANDLERS (MEMOIZED) ---------------------- */
  const onEachRegionFeature = useCallback((feature, layer) => {
    const code = feature.properties[GEO_PROPERTIES.REGION_CODE];
    layer.on({
      mouseover: (e) => {
        if (activeRegion?.code !== code) {
          setHoveredFeature(prev => ({ ...prev, region: code }));
          e.target.bringToFront();
        }
      },
      mouseout: () => setHoveredFeature(prev => ({ ...prev, region: null })),
      click: e => handleRegionClick(e, feature),
    });
    layer.bindTooltip(feature.properties[GEO_PROPERTIES.REGION_NAME], { sticky: true, className: 'region-tooltip' });
  }, [activeRegion, handleRegionClick]); // GEO_PROPERTIES is constant

  const onEachProvinceFeature = useCallback((feature, layer) => {
    const code = feature.properties[GEO_PROPERTIES.PROVINCE_CODE];
    layer.on({
      mouseover: (e) => {
        if (activeProvince?.code !== code) {
           setHoveredFeature(prev => ({ ...prev, province: code }));
           e.target.bringToFront(); // Bring hovered province to front
        }
      },
      mouseout: () => setHoveredFeature(prev => ({ ...prev, province: null })),
      click: e => handleProvinceClick(e, feature),
    });
    layer.bindTooltip(
      `${feature.properties[GEO_PROPERTIES.PROVINCE_NAME]} (${feature.properties[GEO_PROPERTIES.PROVINCE_SIGLA]})`,
      { sticky: true, className: 'region-tooltip' }
    );
  }, [activeProvince, handleProvinceClick]);

  const onEachComuneFeature = useCallback((feature, layer) => {
    const code = feature.properties[GEO_PROPERTIES.COMUNE_CODE];
    layer.on({
      mouseover: (e) => {
        if(activeComune?.code !== code) {
          setHoveredFeature(prev => ({ ...prev, comune: code }));
          // Optionally bring to front: e.target.bringToFront();
        }
      },
      mouseout: () => setHoveredFeature(prev => ({ ...prev, comune: null })),
      click: e => handleComuneClick(e, feature),
    });
    layer.bindTooltip(feature.properties[GEO_PROPERTIES.COMUNE_NAME], { sticky: true, className: 'region-tooltip' });
    if (activeComune?.code === code) {
      layer.bringToFront();
    }
  }, [activeComune, handleComuneClick]);


  /* ---------------------- LOADING / ERROR ---------------------- */
  if (l1 || l2 || l3) return <div className="map-placeholder">Caricamento mappa…</div>;
  if (e1 || e2 || e3) {
    console.error("Errore caricamento dati GeoJSON:", {e1, e2, e3});
    return <div className="map-placeholder">Errore caricamento dati geografici</div>;
  }
  if (!jsonRegioni || !jsonProvincie || !jsonComuni) {
    return <div className="map-placeholder">Dati geografici non disponibili.</div>;
  }

  /* ---------------------- KEYS DINAMICHE ---------------------- */
  const provinceLayerKey = activeRegion ? `province-${activeRegion.code}` : 'provinces-layer'; // Key must be stable or change to remount
  const comuneLayerKey = activeProvince ? `comuni-${activeProvince.code}` : 'comuni-layer';

  /* =============================== RENDER =============================== */
  return (
    <MapContainer
      center={INITIAL_MAP_CENTER}
      zoom={INITIAL_MAP_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-dark)' }}
      whenReady={(mapInstanceEvent) => {
        mapRef.current = mapInstanceEvent.target; // mapInstanceEvent.target is the L.Map instance
        mapInstanceEvent.target.on('mouseout', () => {
          // Only reset hover if mouse truly leaves map, not just moving between features
          if (mapRef.current && !mapRef.current.getContainer().contains(event.relatedTarget)) {
            setHoveredFeature({ region: null, province: null, comune: null });
          }
        });
      }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        attribution="CARTO & OSM"
      />
      <MapController view={mapView} />
      <Pane name="containerPane" style={{ zIndex: 610 }} />
      <Pane name="featuresPane"  style={{ zIndex: 620 }} />

      {/* REGIONI */}
      <GeoJSON
        key="regioni-layer" // Static key as data doesn't change, style is dynamic
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
          interactive={false} // Typically true if it has event handlers, but here it's a visual boundary
        />
      )}

      {/* PROVINCE */}
      {activeRegion && visibleProvinces && (
        <GeoJSON
          key={provinceLayerKey} // Dynamic key to remount when activeRegion changes
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

      {/* COMUNI */}
      {activeProvince && visibleComuni && (
        <GeoJSON
          key={comuneLayerKey} // Dynamic key to remount when activeProvince changes
          ref={refs.comuni}
          data={visibleComuni.features}
          style={getComuneStyle}
          pane="featuresPane"
          onEachFeature={onEachComuneFeature}
        />
      )}
      
      <Legend />
    </MapContainer>
  );
};

export default React.memo(MapChart);