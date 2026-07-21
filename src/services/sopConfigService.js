import { workflowApi } from '../api/workflowApi';

export const fetchSopConfigs = workflowApi.getConfigs;
export const saveStreamSopConfig = workflowApi.saveConfig;
export const deleteStreamSopConfig = workflowApi.deleteConfig;
