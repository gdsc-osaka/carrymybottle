export const CAMPUSES = [
  { id: 'toyonaka', name: '豊中', mapImagePath: '/images/maps/toyonaka.png' },
  { id: 'suita', name: '吹田', mapImagePath: '/images/maps/suita.png' },
  { id: 'minoh', name: '箕面', mapImagePath: '/images/maps/minoh.png' },
] as const;

export type CampusId = (typeof CAMPUSES)[number]['id'];
