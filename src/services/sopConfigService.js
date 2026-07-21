import api from '../api';

export const fetchSopConfigs = api.sop.getConfigs;
export const saveStreamSopConfig = api.sop.saveConfig;
export const deleteStreamSopConfig = api.sop.deleteConfig;
