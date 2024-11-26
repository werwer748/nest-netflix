import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entity/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { afterEach } from 'node:test';

const mockedUserService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn()
};

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockedUserService,
        }
      ],
    }).compile();

    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  // afterEach(() => {
  //   jest.clearAllMocks();
  // });

  it('should be defined', () => {
    expect(userController).toBeDefined();
  });

  describe('create', () => {
    it('should return correct user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@codefactory.ai',
        password: '123123',
      };

      const user = {
        id: 1,
        ...createUserDto,
        password: 'base64encodedPassword'
      };

      jest.spyOn(userService, 'create').mockResolvedValue(user as User);

      const result = await userController.create(createUserDto);

      expect(userService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(user);
    });
  });

  describe('findAll', () => {
    it('should return a list of users', async () => {
      const users = [
        {
          id: 1,
          email: 'test@codefactory.ai',
        },
        {
          id: 2,
          email: 'test2@codefactory.ai',
        },
      ];

      jest.spyOn(userService, 'findAll').mockResolvedValue(users as User[]);

      const result = await userController.findAll();

      expect(userService.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should return a find user', async () => {
      const user = {
        id: 1,
        email: 'test@codefactory.ai',
      };

      jest.spyOn(userService, 'findOne').mockResolvedValue(user as User);

      const result = await userController.findOne(1);

      expect(userService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(user);
    });
  });

  describe('update', () => {
    it('should return updated user', async () => {
      const requestUserId = 1;
      const updateUserDto: UpdateUserDto = {
        email: 'test@codefactory.ai',
        password: 'asdlkjlkjl'
      };

      jest.spyOn(userService, 'update').mockResolvedValue({
        id: requestUserId,
        email: updateUserDto.email
      } as User);

      const result = await userController.update(requestUserId, updateUserDto);

      expect(userService.update).toHaveBeenCalledWith(requestUserId,updateUserDto);
      expect(result).toEqual({
        id: requestUserId,
        email: updateUserDto.email
      });
    });
  });

  describe('remove', () => {
    it('should return a removed user id', async () => {
      const id = 999;

      jest.spyOn(userService, 'remove').mockResolvedValue(id);

      const result = await userController.remove(id);

      expect(userService.remove).toHaveBeenCalledWith(id);
      expect(result).toEqual(id);
    });
  });
});
