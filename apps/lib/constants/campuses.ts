export const CAMPUSES = [
  { id: 'toyonaka', name: '豊中', mapImagePath: '/maps/toyonaka.png' },
  { id: 'suita', name: '吹田', mapImagePath: '/maps/suita.png' },
  { id: 'minoh', name: '箕面', mapImagePath: '/maps/minoh.png' },
] as const;

export type CampusId = (typeof CAMPUSES)[number]['id'];
