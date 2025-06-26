import { useState, useEffect } from 'react';

const cache = {}; // Il sistema di caching rimane lo stesso

export const useGeoJSON = (path) => {
  const [data, setData] = useState(cache[path] || null);
  const [loading, setLoading] = useState(!cache[path]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      // Se i dati sono già in cache, non fare nulla
      if (cache[path]) {
        return;
      }
      
      try {
        // --- MODIFICA CHIAVE: Usa fetch() invece di import() ---
        const response = await fetch(path);

        if (!response.ok) {
          // Gestisce errori HTTP come 404 o 500
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonData = await response.json();
        
        // Salva i dati nella cache
        cache[path] = jsonData;
        
        if (mounted) {
          setData(jsonData);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
        }
        console.error(`Errore nel caricamento del GeoJSON da ${path}:`, err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [path]); // L'effetto dipende solo dal percorso

  return { data, loading, error };
};