
import {
    IsIn,
    IsNotEmpty,
    IsString,
} from 'class-validator';

export class CreateConfirmationDto {
    @IsString({
        message: 'El tipo de confirmación debe ser texto.',
    })
    @IsNotEmpty({
        message: 'El tipo de confirmación es obligatorio.',
    })
    @IsIn(['confirma', 'refuta'], {
        message: 'La confirmación debe ser "confirma" o "refuta".',
    })
    tipo_confirmacion: 'confirma' | 'refuta';
}
