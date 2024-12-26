import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { DirectorService } from './director.service';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('director')
@ApiBearerAuth()
@ApiTags('director')
//? mongoose와 충돌 방지
// @UseInterceptors(ClassSerializerInterceptor)
export class DirectorController {
  constructor(private readonly directorService: DirectorService) {}

  @Get()
  findAll() {
    return this.directorService.findAll();
  }

  @Get(':id')
  // findOne(@Param('id', ParseIntPipe) id: number) {
  //? mongoose _id -> string
  findOne(@Param('id') id: string) {
    return this.directorService.findOne(id);
  }

  @Post()
  create(@Body() createDirectorDto: CreateDirectorDto) {
    return this.directorService.create(createDirectorDto);
  }

  @Patch(':id')
  update(
    // @Param('id', ParseIntPipe) id: number,
    //? mongoose _id -> string
    @Param('id') id: string,
    @Body() updateDirectorDto: UpdateDirectorDto,
  ) {
    return this.directorService.update(id, updateDirectorDto);
  }

  @Delete(':id')
  // remove(@Param('id', ParseIntPipe) id: number) {
  //? mongoose _id -> string
  remove(@Param('id') id: string) {
    return this.directorService.remove(id);
  }
}
