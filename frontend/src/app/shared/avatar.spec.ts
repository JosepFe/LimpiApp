import { avatarColor, initial, members } from './avatar';

describe('avatar helpers', () => {
  it('colour by position, initial and member count in singular or plural', () => {
    expect([avatarColor(0), avatarColor(1), avatarColor(6)]).toEqual(['teal', 'violet', 'teal']);
    expect(initial(' casa de la playa')).toBe('C');
    expect([members(1), members(3)]).toEqual(['1 miembro', '3 miembros']);
  });
});
