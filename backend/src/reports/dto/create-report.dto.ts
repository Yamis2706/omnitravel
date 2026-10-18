
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateReportDto {
    @IsInt({ message: 'El ID del punto de interés debe ser un entero.' })
    @Min(1, { message: 'El ID del punto de interés debe ser positivo.' })
    poi_id: number;

    @IsString({ message: 'El tipo de reporte debe ser texto.' })
    @IsNotEmpty({ message: 'El tipo de reporte es obligatorio.' })
    @MaxLength(100, {
        message: 'El tipo de reporte no puede superar 100 caracteres.',
    })
    tipo: string;

    @IsOptional()
    @IsString({ message: 'La descripción debe ser texto.' })
    @MaxLength(2000, {
        message: 'La descripción no puede superar 2000 caracteres.',
    })
    descripcion?: string;
}
