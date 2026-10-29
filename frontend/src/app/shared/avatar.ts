/** Avatar colour keys of the prototype (`--av-*`), by position: the first household is teal, the second violet… */
export const AVATAR_COLORS = ['teal', 'violet', 'amber', 'rose', 'blue', 'green'];

export const avatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];

export const initial = (name: string) => name.trim().charAt(0).toUpperCase();

/** «1 miembro», «3 miembros». */
export const members = (count: number) => `${count} ${count === 1 ? 'miembro' : 'miembros'}`;
