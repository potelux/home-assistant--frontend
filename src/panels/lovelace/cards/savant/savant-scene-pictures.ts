const STORAGE_KEY = "savant_scene_pictures_v1";

export const getSavantScenePictures = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
};

export const getSavantScenePicture = (sceneId: string): string | undefined =>
  getSavantScenePictures()[sceneId];

export const setSavantScenePicture = (
  sceneId: string,
  picture: string | null | undefined
): void => {
  const pictures = getSavantScenePictures();
  if (picture) {
    pictures[sceneId] = picture;
  } else {
    delete pictures[sceneId];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pictures));
};

export const removeSavantScenePicture = (sceneId: string): void => {
  setSavantScenePicture(sceneId, null);
};
