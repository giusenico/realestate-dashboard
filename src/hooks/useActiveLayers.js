import { useMemo } from 'react';
import { GEO_PROPERTIES } from '../config';

export const useActiveLayers = (selectedFeature, jsonRegioni, jsonProvincie, jsonComuni) => {
  const activeRegion = useMemo(() => {
    if (!selectedFeature?.[GEO_PROPERTIES.REGION_CODE] || !jsonRegioni) return null;
    const feat = jsonRegioni.features.find(f => f.properties[GEO_PROPERTIES.REGION_CODE] === selectedFeature[GEO_PROPERTIES.REGION_CODE]);
    return feat ? { code: selectedFeature[GEO_PROPERTIES.REGION_CODE], feature: feat } : null;
  }, [selectedFeature, jsonRegioni]);

  const activeProvince = useMemo(() => {
    if (!selectedFeature?.[GEO_PROPERTIES.PROVINCE_CODE] || !jsonProvincie) return null;
    const feat = jsonProvincie.features.find(f => f.properties[GEO_PROPERTIES.PROVINCE_CODE] === selectedFeature[GEO_PROPERTIES.PROVINCE_CODE]);
    return feat ? { code: selectedFeature[GEO_PROPERTIES.PROVINCE_CODE], feature: feat } : null;
  }, [selectedFeature, jsonProvincie]);

  const activeComune = useMemo(() => {
    if (!selectedFeature?.[GEO_PROPERTIES.COMUNE_CODE] || !jsonComuni) return null;
    const feat = jsonComuni.features.find(f => f.properties[GEO_PROPERTIES.COMUNE_CODE] === selectedFeature[GEO_PROPERTIES.COMUNE_CODE]);
    return feat ? { code: selectedFeature[GEO_PROPERTIES.COMUNE_CODE], feature: feat } : null;
  }, [selectedFeature, jsonComuni]);

  const visibleProvinces = useMemo(() => {
    if (!activeRegion || !jsonProvincie) return null;
    return { ...jsonProvincie, features: jsonProvincie.features.filter(f => f.properties[GEO_PROPERTIES.REGION_CODE] === activeRegion.code) };
  }, [activeRegion, jsonProvincie]);

  const visibleComuni = useMemo(() => {
    if (!activeProvince || !jsonComuni) return null;
    return { ...jsonComuni, features: jsonComuni.features.filter(f => f.properties[GEO_PROPERTIES.PROVINCE_CODE] === activeProvince.code) };
  }, [activeProvince, jsonComuni]);

  return { activeRegion, activeProvince, activeComune, visibleProvinces, visibleComuni };
}; 