import api from '../api';

export const fetchCameras = api.cameras.list;
export const addCamera = api.cameras.create;
export const removeCamera = api.cameras.remove;
