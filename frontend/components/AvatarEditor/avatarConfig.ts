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
    id: 'glasses',
    name: 'Glasses',
    folder: '12_glasses',
    zIndex: 55,
    options: {
      male: [],
      female: ['glass_01.svg', 'glass_02.svg', 'glass_03.svg', 'glass_04.svg', 'glass_05.svg', 'glass_06.svg', 'glass_07.svg', 'glass_08.svg', 'glass_09.svg', 'glass_10.svg', 'glass_11.svg', 'glass_12.svg', 'glass_13.svg', 'glass_14.svg', 'glass_15.svg', 'glass_16.svg']
    }
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
    options: {
      male: ['nose_01.svg', 'nose_02.svg', 'nose_03.svg', 'nose_04.svg', 'nose_05.svg', 'nose_06.svg', 'nose_07.svg', 'nose_08.svg', 'nose_09.svg', 'nose_10.svg', 'nose_11.svg', 'nose_12.svg', 'nose_13.svg', 'nose_14.svg', 'nose_15.svg', 'nose_16.svg'],
      female: ['nose_01.svg']
    }
  },
  {
    id: 'mouth',
    name: 'Mouth',
    folder: '02_mouth',
    zIndex: 80,
    options: {
      male: ['mouth_01.svg', 'mouth_02.svg', 'mouth_03.svg', 'mouth_04.svg', 'mouth_05.svg', 'mouth_06.svg', 'mouth_07.svg', 'mouth_08.svg', 'mouth_09.svg', 'mouth_10.svg', 'mouth_11.svg', 'mouth_12.svg', 'mouth_13.svg', 'mouth_14.svg', 'mouth_15.svg', 'mouth_16.svg'],
      female: ['mouth_01.svg']
    }
  },
  {
    id: 'mustache',
    name: 'Mustache',
    folder: '12_mustache',
    zIndex: 85,
    options: { male: ['mustache_01.svg', 'mustache_02.svg', 'mustache_03.svg', 'mustache_04.svg', 'mustache_05.svg', 'mustache_06.svg', 'mustache_07.svg', 'mustache_08.svg', 'mustache_09.svg', 'mustache_10.svg', 'mustache_11.svg', 'mustache_12.svg', 'mustache_13.svg', 'mustache_14.svg'], female: [] }
  },
  {
    id: 'hair',
    name: 'Hair',
    folder: '01_hair',
    zIndex: 90,
    options: {
      male: ['hair_01.svg', 'hair_02.svg', 'hair_03.svg', 'hair_04.svg', 'hair_05.svg', 'hair_06.svg', 'hair_07.svg', 'hair_08.svg', 'hair_09.svg', 'hair_10.svg', 'hair_11.svg', 'hair_12.svg', 'hair_13.svg', 'hair_14.svg', 'hair_15.svg', 'hair_16.svg', 'hair_17.svg', 'hair_18.svg'],
      female: ['hair_01.svg', 'hair_02.svg', 'hair_03.svg', 'hair_04.svg', 'hair_05.svg', 'hair_06.svg', 'hair_07.svg', 'hair_08.svg', 'hair_09.svg', 'hair_10.svg', 'hair_11.svg', 'hair_12.svg', 'hair_13.svg', 'hair_14.svg', 'hair_15.svg', 'hair_16.svg', 'hair_17.svg']
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


