import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';

@Controller('cases')
@UseGuards(JwtAuthGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  create(
    @Body() createCaseDto: CreateCaseDto,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.casesService.create(createCaseDto, request.user);
  }

  @Get()
  findAll(@Req() request: Request & { user: AuthUser }) {
    return this.casesService.findAll(request.user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.casesService.findOne(id, request.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCaseDto: UpdateCaseDto,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.casesService.update(id, updateCaseDto, request.user);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.casesService.remove(id, request.user);
  }
}
