import { fotoDePoi } from '../services/mocks/fotosPoi';

describe('fotoDePoi', () => {
  it('empareja por nombre ignorando acentos y mayúsculas', () => {
    expect(fotoDePoi('Café del Parque')).toBeDefined();
    expect(fotoDePoi('cafe del parque')).toBeDefined();
    expect(fotoDePoi('Museo del Quindío')).toBeDefined();
    expect(fotoDePoi('HOTEL MÓCAWA'.replace('Ó', 'O'))).toBeDefined();
  });

  it('devuelve undefined para lugares sin foto en los mockups', () => {
    expect(fotoDePoi('Mirador Alto de la Cruz')).toBeUndefined();
    expect(fotoDePoi('Biblioteca Departamental')).toBeUndefined();
    expect(fotoDePoi('')).toBeUndefined();
  });
});
