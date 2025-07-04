import { useMemo } from 'react';
import { calculatePercentageChanges, getMinMaxForVariation } from '../utils/mapUtils';

export const useChoroplethData = (regionalData, selectedMetric, selectedYear) => {
  const regionalVariations = useMemo(() => {
    if (!regionalData || !selectedMetric || !selectedYear) return null;
    return calculatePercentageChanges(regionalData, selectedMetric, selectedYear);
  }, [regionalData, selectedMetric, selectedYear]);

  const colorScale = useMemo(() => {
    if (!regionalVariations) return null;
    return getMinMaxForVariation(regionalVariations);
  }, [regionalVariations]);

  return { regionalVariations, colorScale };
}; 