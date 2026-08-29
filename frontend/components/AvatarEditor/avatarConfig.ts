export type AvatarCategory = {
  id: string;
  name: string;
  folder: string;
  zIndex: number;
  options: string[];
};

// The zIndex is ordered from back to front (e.g., body at back, hair at front)
// Note: 09_skin doesn't have files right now based on our directory check, so omitting options.
export const avatarCategories: AvatarCategory[] = [
  { id: 'body', name: 'Body', folder: '11_body', zIndex: 10, options: ['body_01.svg'] },
  { id: 'clothes', name: 'Clothes', folder: '10_clothes', zIndex: 20, options: ['cloth_01.svg'] },
  { id: 'ear', name: 'Ears', folder: '08_ear', zIndex: 30, options: ['ear_01.svg'] },
  { id: 'face', name: 'Face', folder: '06_face', zIndex: 40, options: ['face_01.svg'] },
  { id: 'eyes', name: 'Eyes', folder: '05_eyes', zIndex: 50, options: ['eye_01.svg'] },
  { id: 'eyebrows', name: 'Eyebrows', folder: '04_eyebrows', zIndex: 60, options: ['eyebrow_01.svg'] },
  { id: 'nose', name: 'Nose', folder: '03_nose', zIndex: 70, options: ['nose_01.svg'] },
  { id: 'mouth', name: 'Mouth', folder: '02_mouth', zIndex: 80, options: ['mouth_01.svg'] },
  { id: 'hair', name: 'Hair', folder: '01_hair', zIndex: 90, options: ['hair_01.svg', 'hair_02.svg', 'hair_03.svg', 'hair_04.svg'] },
];

export type AvatarConfigType = {
  [key: string]: string | null;
};

// Default avatar with the first option for every category selected
export const defaultAvatarConfig: AvatarConfigType = avatarCategories.reduce((acc, cat) => {
  acc[cat.id] = cat.options.length > 0 ? cat.options[0] : null;
  return acc;
}, {} as AvatarConfigType);
