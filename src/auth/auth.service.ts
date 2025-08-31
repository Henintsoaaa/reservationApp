import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload, AuthResponse } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { name, email, password, role = 'user', phone } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await this.usersService.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
    });

    if (!result.insertedId) {
      throw new BadRequestException('Failed to create user');
    }

    // Generate JWT token
    const user = {
      id: result.insertedId.toString(),
      name,
      email,
      role,
      phone,
    };

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    console.log('AuthService.login - Looking for user with email:', email);

    // Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      console.log('AuthService.login - No user found with email:', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('AuthService.login - User found:', {
      id: user._id,
      email: user.email,
      hasPassword: !!user.password,
    });

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('AuthService.login - Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('AuthService.login - Password verification failed');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async refreshToken(user: any): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    };
  }
}
