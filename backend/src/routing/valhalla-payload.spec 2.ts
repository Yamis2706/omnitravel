import {
    construirSolicitudValhalla,
    normalizarRespuestaValhalla,
    validarCoordenada,
} from './valhalla-payload';

describe('validarCoordenada', () => {
    it('acepta [latitud, longitud] válidas', () => {
        expect(validarCoordenada([4.53389, -75.68111], 'origin')).toEqual([
            4.53389, -75.68111,
        ]);
    });

    it('rechaza valores que no son pares numéricos', () => {
        expect(() => validarCoordenada([4.5], 'origin')).toThrow(
            'origin debe ser [latitud, longitud].',
        );
        expect(() => validarCoordenada(['4.5', -75.6], 'destination')).toThrow(
            'destination debe ser [latitud, longitud].',
        );
        expect(() => validarCoordenada(null, 'origin')).toThrow();
    });

    it('rechaza coordenadas fuera de rango geográfico', () => {
        expect(() => validarCoordenada([95, -75.6], 'origin')).toThrow(
            'origin está fuera de rango geográfico.',
        );
    });
});

describe('construirSolicitudValhalla', () => {
    const origen: [number, number] = [4.537, -75.675];
    const destino: [number, number] = [4.53389, -75.68111];

    it('usa costing peatonal sin opciones cuando no hay restricciones', () => {
        const { solicitud, advertencias } = construirSolicitudValhalla(
            origen,
            destino,
        );
        expect(solicitud.costing).toBe('pedestrian');
        expect(solicitud.costing_options.pedestrian).toEqual({});
        expect(solicitud.language).toBe('es-ES');
        expect(solicitud.locations).toEqual([
            { lat: 4.537, lon: -75.675 },
            { lat: 4.53389, lon: -75.68111 },
        ]);
        expect(advertencias).toEqual([]);
    });

    it('aplica el tipo wheelchair, penaliza escaleras y favorece ascensores (motriz)', () => {
        const { solicitud } = construirSolicitudValhalla(origen, destino, {
            perfil: 'silla_de_ruedas',
            avoidStairs: true,
            requireElevator: true,
        });
        expect(solicitud.costing_options.pedestrian).toEqual({
            type: 'wheelchair',
            step_penalty: 3600,
            elevator_penalty: 0,
        });
    });

    it('aplica narración asistida (blind) para el perfil visual', () => {
        const { solicitud, advertencias } = construirSolicitudValhalla(
            origen,
            destino,
            { perfil: 'visual', preferSoundTrafficLights: true },
        );
        expect(solicitud.costing_options.pedestrian).toEqual({
            type: 'blind',
        });
        expect(advertencias).toEqual([]);
    });

    it('advierte cuando se piden semáforos sonoros sin perfil visual', () => {
        const { advertencias } = construirSolicitudValhalla(origen, destino, {
            preferSoundTrafficLights: true,
        });
        expect(advertencias).toHaveLength(1);
        expect(advertencias[0]).toContain('semáforos sonoros');
    });
});

describe('normalizarRespuestaValhalla', () => {
    const crudo = {
        trip: {
            summary: { length: 1.234, time: 905 },
            legs: [
                {
                    shape: 'abc123',
                    maneuvers: [
                        { type: 1, instruction: 'Camina hacia el norte.', length: 0.2 },
                        { type: 10, instruction: 'Gira a la derecha.', length: 0.8 },
                        { type: 4, instruction: 'Has llegado.', length: 0.234 },
                    ],
                },
            ],
        },
        warnings: ['La ruta puede incluir escaleras.', 42],
    };

    it('normaliza resumen, pasos y advertencias del motor', () => {
        const ruta = normalizarRespuestaValhalla(crudo, 'silla_de_ruedas');
        expect(ruta.distanciaKm).toBe(1.234);
        expect(ruta.duracionMin).toBe(15.1);
        expect(ruta.perfil).toBe('silla_de_ruedas');
        expect(ruta.shape).toBe('abc123');
        expect(ruta.pasos).toHaveLength(3);
        expect(ruta.pasos[1]).toEqual({
            tipo: 10,
            instruccion: 'Gira a la derecha.',
            distanciaKm: 0.8,
        });
        // Solo se conservan avisos de texto del motor.
        expect(ruta.advertencias).toEqual(['La ruta puede incluir escaleras.']);
    });

    it('adjunta las advertencias adicionales del backend', () => {
        const ruta = normalizarRespuestaValhalla(crudo, 'peatonal', [
            'Aviso propio.',
        ]);
        expect(ruta.advertencias).toContain('Aviso propio.');
    });

    it('falla con un error claro cuando el motor no devuelve resumen', () => {
        expect(() => normalizarRespuestaValhalla({}, 'peatonal')).toThrow(
            'El motor de ruteo devolvió una respuesta inesperada.',
        );
        expect(() =>
            normalizarRespuestaValhalla({ trip: { summary: { length: 1 } } }, 'peatonal'),
        ).toThrow('El motor de ruteo devolvió una respuesta inesperada.');
    });

    it('tolera tramos sin maneuvers (ruta sin pasos)', () => {
        const ruta = normalizarRespuestaValhalla(
            { trip: { summary: { length: 0.5, time: 300 }, legs: [{}] } },
            'peatonal',
        );
        expect(ruta.pasos).toEqual([]);
        expect(ruta.shape).toBeUndefined();
    });
});
