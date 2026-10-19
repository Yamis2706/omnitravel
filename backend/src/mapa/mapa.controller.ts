import { Controller, Get } from '@nestjs/common';
import { MapaService } from './mapa.service';

@Controller('mapa')
export class MapaController {
  constructor(private readonly mapaService: MapaService) { }

  // GET /mapa — público, como la lectura anónima que tenía Supabase.
  @Get()
  datos() {
    return this.mapaService.datos();
  }
}
