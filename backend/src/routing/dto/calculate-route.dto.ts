import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsNumber,
    Validate,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

// Validador personalizado: comprueba que el valor sea un par
// [longitud, latitud] con números finitos dentro de los rangos geográficos.
@ValidatorConstraint({ name: 'isValidCoordinates', async: false })
class IsValidCoordinatesConstraint
    implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        // Debe ser un arreglo de exactamente 2 números finitos.
        if (
            !Array.isArray(value) ||
            value.length !== 2 ||
            !value.every(
                (coordinate) =>
                    typeof coordinate === 'number' &&
                    Number.isFinite(coordinate),
            )
        ) {
            return false;
        }

        const [longitude, latitude] = value;

        // Longitud entre -180 y 180; latitud entre -90 y 90.
        return (
            longitude >= -180 &&
            longitude <= 180 &&
            latitude >= -90 &&
            latitude <= 90
        );
    }

    // Mensaje de error que se devuelve en el 400 cuando la validación falla.
    defaultMessage(args: ValidationArguments): string {
        return `${args.property} debe contener [longitud, latitud] con longitud entre -180 y 180 y latitud entre -90 y 90.`;
    }
}

// DTO del cuerpo de la solicitud para calcular una ruta.
export class CalculateRouteDto {
    // @ApiProperty: documenta la propiedad en Swagger (descripción, ejemplo,
    // tipo de elementos y tamaño del arreglo). No valida nada por sí solo;
    // la validación la hacen los decoradores de class-validator de abajo.
    @ApiProperty({
        description:
            'Coordenadas del origen en formato [longitud, latitud]. La longitud debe estar entre -180 y 180, y la latitud entre -90 y 90.',
        example: [-75.673, 4.535],
        type: [Number],
        minItems: 2,
        maxItems: 2,
    })
    // Validaciones de class-validator (se conservan todas):
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsNumber(
        { allowNaN: false, allowInfinity: false },
        { each: true },
    )
    @Validate(IsValidCoordinatesConstraint)
    origin: [number, number];

    @ApiProperty({
        description:
            'Coordenadas del destino en formato [longitud, latitud]. La longitud debe estar entre -180 y 180, y la latitud entre -90 y 90.',
        example: [-75.6803, 4.5355],
        type: [Number],
        minItems: 2,
        maxItems: 2,
    })
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsNumber(
        { allowNaN: false, allowInfinity: false },
        { each: true },
    )
    @Validate(IsValidCoordinatesConstraint)
    destination: [number, number];
}