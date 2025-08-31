import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venues.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
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

  @Get('available')
  @Public()
  async findAvailable(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ): Promise<any[]> {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return this.venuesService.findAvailableVenues(start, end);
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string): Promise<any> {
    return this.venuesService.findOne(id);
  }

  @Post()
  @Roles('admin')
  async create(@Body() createVenueDto: CreateVenueDto): Promise<any> {
    return this.venuesService.create(createVenueDto);
  }

  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() updateVenueDto: UpdateVenueDto,
  ): Promise<any> {
    return this.venuesService.update(id, updateVenueDto);
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string): Promise<any> {
    return this.venuesService.delete(id);
  }
}
