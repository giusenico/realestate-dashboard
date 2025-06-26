import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './Legend.css';

const Legend = () => {
    const map = useMap();

    React.useEffect(() => {
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = `
                <h4>Legenda</h4>
                <div><i style="background: #3949ab; opacity: 0.6"></i><span>Regione</span></div>
                <div><i style="background: #ffc107; opacity: 0.9"></i><span>Selezione / In Evidenza</span></div>
            `;
            return div;
        };

        legend.addTo(map);
        return () => legend.remove();
    }, [map]);

    return null;
};

export default Legend;