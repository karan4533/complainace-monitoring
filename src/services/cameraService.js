import {
  createCamera,
  fetchCameraFeeds,
  listCameras,
  removeCamera as removeCameraApi,
  submitStreamUrl,
} from '../api/cameraApi';

export const fetchCameras = listCameras;
export const addCamera = createCamera;
export const removeCamera = removeCameraApi;
export const submitCameraStreamUrl = submitStreamUrl;
export { fetchCameraFeeds };
