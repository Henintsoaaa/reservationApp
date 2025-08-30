import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: any) {
    // Users can only see their own profile unless they're admin
    if (currentUser.id !== id && currentUser.role !== 'admin') {
      throw new ForbiddenException('You can only access your own profile');
    }
    return this.usersService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() user: CreateUserDto) {
    return this.usersService.create(user);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() user: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    // Users can only update their own profile unless they're admin
    if (currentUser.id !== id && currentUser.role !== 'admin') {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersService.update(id, user);
  }
}
