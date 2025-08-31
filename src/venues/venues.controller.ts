import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenuesDto } from './dto/create-venues.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('venues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @Public()
  async findAll(): Promise<any[]> {
    return this.venuesService.findAll();
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string): Promise<any> {
    return this.venuesService.findOne(id);
  }

  @Post()
  @Roles('admin')
  async create(@Body() createVenuesDto: CreateVenuesDto): Promise<any> {
    return this.venuesService.create(createVenuesDto);
  }

  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() updateVenuesDto: CreateVenuesDto,
  ): Promise<any> {
    return this.venuesService.update(id, updateVenuesDto);
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string): Promise<any> {
    return this.venuesService.delete(id);
  }
}
