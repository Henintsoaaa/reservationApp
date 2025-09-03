import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BookingOwnershipGuard } from '../auth/guards/booking-ownership.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles('user', 'admin')
  create(@Body() createBookingDto: CreateBookingDto, @CurrentUser() user: any) {
    return this.bookingsService.create(createBookingDto, { userId: user.id });
  }

  @Get()
  @Roles('admin', 'user')
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get('my-bookings')
  @Roles('user', 'admin')
  findMyBookings(@CurrentUser() user: any) {
    return this.bookingsService.findByUserId(user.id);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @UseGuards(BookingOwnershipGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @UseGuards(BookingOwnershipGuard)
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user: any,
  ) {
    return this.bookingsService.update(id, updateBookingDto, {
      userId: user.id,
    });
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @UseGuards(BookingOwnershipGuard)
  remove(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user: any,
  ) {
    return this.bookingsService.remove(id, {
      userId: user.id,
    });
  }

  @Get('stats/:eventId')
  @Roles('admin', 'user')
  getEventStats(@Param('eventId') eventId: string) {
    return this.bookingsService.getEventStats(eventId);
  }

  @Get('available-seats/:eventId')
  @Roles('admin', 'user')
  getAvailableSeats(@Param('eventId') eventId: string) {
    return this.bookingsService.getAvailableSeats(eventId);
  }
}
