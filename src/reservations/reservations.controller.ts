import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import {
  CreateReservationDto,
  UpdateReservationDto,
  ReservationStatus,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @Roles('admin')
  async findAll() {
    return this.reservationsService.findAll();
  }

  @Get('my-reservations')
  async findMyReservations(@CurrentUser() user: any) {
    return this.reservationsService.findByUserId(user.id);
  }

  @Get('check-availability/:venueId')
  @Public()
  async checkAvailability(
    @Param('venueId') venueId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const isAvailable = await this.reservationsService.checkAvailability(
      venueId,
      start,
      end,
    );

    return {
      venueId,
      startTime: start,
      endTime: end,
      available: isAvailable,
    };
  }

  @Get('venue-availability/:venueId')
  @Public()
  async getVenueAvailability(
    @Param('venueId') venueId: string,
    @Query('date') date: string,
  ) {
    return this.reservationsService.getVenueAvailability(venueId, date);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reservationsService.findOneWithOwnershipCheck(id, user);
  }

  @Post()
  async create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.create(createReservationDto, user.id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.update(id, updateReservationDto, user);
  }

  @Put(':id/status')
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ReservationStatus,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.updateStatus(id, status, user);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reservationsService.remove(id, user);
  }
}
