export type AvatarGender = 'male' | 'female';

export type AvatarCategory = {
  id: string;
  name: string;
  folder: string;
  zIndex: number;
  options: {
    male: string[];
    female: string[];
  };
};

export const avatarCategories: AvatarCategory[] = [
  { 
    id: 'body', 
    name: 'Body', 
    folder: '11_body', 
    zIndex: 10, 
    options: { male: ['body_01.svg'], female: ['body_01.svg'] } 
  },
  { 
    id: 'clothes', 
    name: 'Clothes', 
    folder: '10_clothes', 
    zIndex: 20, 
    options: { male: ['cloth_01.svg'], female: ['cloth_01.svg'] } 
  },
  { 
    id: 'ear', 
    name: 'Ears', 
    folder: '08_ear', 
    zIndex: 30, 
    options: { male: ['ear_01.svg'], female: ['ear_01.svg'] } 
  },
  { 
    id: 'face', 
    name: 'Face', 
    folder: '06_face', 
    zIndex: 40, 
    options: { male: ['face_01.svg'], female: ['face_01.svg'] } 
  },
  { 
    id: 'eyes', 
    name: 'Eyes', 
    folder: '05_eyes', 
    zIndex: 50, 
    options: { male: ['eye_01.svg'], female: ['eye_01.svg'] } 
  },
  { 
    id: 'eyebrows', 
    name: 'Eyebrows', 
    folder: '04_eyebrows', 
    zIndex: 60, 
    options: { male: ['eyebrow_01.svg'], female: ['eyebrow_01.svg'] } 
  },
  { 
    id: 'nose', 
    name: 'Nose', 
    folder: '03_nose', 
    zIndex: 70, 
    options: { male: ['nose_01.svg'], female: ['nose_01.svg'] } 
  },
  { 
    id: 'mouth', 
    name: 'Mouth', 
    folder: '02_mouth', 
    zIndex: 80, 
    options: { male: ['mouth_01.svg'], female: ['mouth_01.svg'] } 
  },
  { 
    id: 'mustache', 
    name: 'Mustache', 
    folder: '12_mustache', 
    zIndex: 85, 
    options: { male: ['mustache_01.svg'], female: [] } 
  },
  { 
    id: 'hair', 
    name: 'Hair', 
    folder: '01_hair', 
    zIndex: 90, 
    options: { 
      male: ['hair_01.svg', 'hair_02.svg', 'hair_03.svg', 'hair_04.svg'],
      female: ['hair_01.svg', 'hair_02.svg']
    } 
  },
];

export type AvatarConfigType = {
  gender: AvatarGender;
  [key: string]: string | null;
};

// Default male avatar
export const defaultMaleConfig: AvatarConfigType = avatarCategories.reduce(
  (acc, cat) => {
    acc[cat.id] = cat.options.male.length > 0 ? cat.options.male[0] : null;
    return acc;
  },
  { gender: 'male' } as AvatarConfigType
);

// Default female avatar
export const defaultFemaleConfig: AvatarConfigType = avatarCategories.reduce(
  (acc, cat) => {
    acc[cat.id] = cat.options.female.length > 0 ? cat.options.female[0] : null;
    return acc;
  },
  { gender: 'female' } as AvatarConfigType
);
